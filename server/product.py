from typing import List, Dict, Any, Tuple, Optional
import concurrent.futures
from dataclasses import dataclass
import logging
from pathlib import Path
import json
import csv
import pandas as pd
import requests
from bs4 import BeautifulSoup
import time
import random
from fake_useragent import UserAgent
import re
from datetime import datetime
import aiohttp
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential
import backoff
from threading import Lock

@dataclass
class Product:
    name: str
    description: str
    price: float
    category: str
    subcategory: str
    brand: str
    url: str
    rating: float
    review_count: int
    scraped_at: datetime

class RateLimiter:
    """Advanced rate limiter with token bucket algorithm."""
    def __init__(self, rate: int, per: float, burst: int = 1):
        self.rate = rate
        self.per = per
        self.burst = burst
        self.tokens = burst
        self.last_update = time.time()
        self.lock = Lock()
        
    def acquire(self) -> bool:
        with self.lock:
            now = time.time()
            time_passed = now - self.last_update
            self.tokens = min(self.burst, self.tokens + time_passed * (self.rate / self.per))
            self.last_update = now
            
            if self.tokens >= 1:
                self.tokens -= 1
                return True
            return False

class AmazonScraper:
    def __init__(self, max_threads: int = 12, categories_file: str = "categories.json"):
        self.max_threads = max_threads
        self.categories_file = Path(categories_file)
        self.logger = logging.getLogger(__name__)
        self.user_agent = UserAgent()
        self.session = self._create_session()
        self.rate_limiter = RateLimiter(rate=10, per=60, burst=20)
        self.cache = {}
        self.batch_size = 50
        self.results_lock = Lock()

    def get_headers(self) -> Dict[str, str]:
        """Generate random headers to avoid detection."""
        return {
            'User-Agent': self.user_agent.random,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        }
        
    def _create_session(self) -> requests.Session:
        session = requests.Session()
        session.headers.update(self.get_headers())
        return session

    def load_categories(self) -> List[Dict[str, Any]]:
        """Load categories from JSON file."""
        try:
            with open(self.categories_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data['main_categories']
        except FileNotFoundError:
            self.logger.error(f"Categories file not found: {self.categories_file}")
            raise
        except json.JSONDecodeError:
            self.logger.error(f"Invalid JSON in categories file: {self.categories_file}")
            raise

    async def search_amazon(self, category: str, subcategory: str, brand: str) -> List[Product]:
        """Search Amazon for products."""
        try:
            search_query = f"{brand} {subcategory} {category}"
            encoded_query = requests.utils.quote(search_query)
            url = f"https://www.amazon.com/s?k={encoded_query}"
            
            async with aiohttp.ClientSession(headers=self.get_headers()) as session:
                async with session.get(url) as response:
                    content = await response.text()
            
            soup = BeautifulSoup(content, 'html.parser')
            products = []
            
            for item in soup.select('div[data-asin]:not([data-asin=""])'):
                try:
                    product = await self._parse_product(item, category, subcategory, brand)
                    if product:
                        products.append(product)
                        if len(products) >= 5:
                            break
                except Exception as e:
                    self.logger.error(f"Error parsing product: {str(e)}")
                    continue
            
            return products
            
        except Exception as e:
            self.logger.error(f"Error searching Amazon: {str(e)}")
            return []

    async def _parse_product(self, item: BeautifulSoup, category: str, subcategory: str, brand: str) -> Optional[Product]:
        """Parse product data."""
        try:
            name = item.select_one('span.a-text-normal')
            price_elem = item.select_one('span.a-offscreen')
            
            if not name or not price_elem:
                return None
                
            name = name.text.strip()
            price_str = price_elem.text.strip().replace('$', '').replace(',', '')
            price = float(re.findall(r'\d+\.?\d*', price_str)[0])
            
            rating_elem = item.select_one('span.a-icon-alt')
            rating = float(rating_elem.text.split(' ')[0]) if rating_elem else 0.0
            
            reviews_elem = item.select_one('span.a-size-base.s-underline-text')
            review_count = int(reviews_elem.text.replace(',', '')) if reviews_elem else 0
            
            url = f"https://www.amazon.com/dp/{item['data-asin']}"
            description = await self._get_product_description(url)
            
            return Product(
                name=name,
                description=description,
                price=price,
                category=category,
                subcategory=subcategory,
                brand=brand,
                url=url,
                rating=rating,
                review_count=review_count,
                scraped_at=datetime.now()
            )
            
        except Exception as e:
            self.logger.error(f"Error parsing product details: {str(e)}")
            return None

    async def _get_product_description(self, url: str) -> str:
        """Get product description."""
        try:
            async with aiohttp.ClientSession(headers=self.get_headers()) as session:
                async with session.get(url) as response:
                    content = await response.text()
            
            soup = BeautifulSoup(content, 'html.parser')
            description_elem = soup.select_one('#productDescription')
            return description_elem.text.strip() if description_elem else ""
            
        except Exception as e:
            self.logger.error(f"Error getting product description: {str(e)}")
            return ""

    async def scrape_all_categories(self) -> List[Dict[str, Any]]:
        """Scrape all categories."""
        main_categories = self.load_categories()
        all_products = []
        
        for category in main_categories:
            for item in category['items']:
                for subcategory in item['subcategories']:
                    for brand in item['brands']:
                        if brand.lower() == 'generic':
                            continue
                        
                        products = await self.search_amazon(
                            category=category['title'],
                            subcategory=subcategory,
                            brand=brand
                        )
                        all_products.extend(products)
                        self.logger.info(f"Scraped {len(products)} products for {brand} {subcategory}")
                        
                        # Rate limiting
                        await asyncio.sleep(random.uniform(1, 3))

        return [self._product_to_dict(p) for p in all_products]

    def _product_to_dict(self, product: Product) -> Dict[str, Any]:
        """Convert Product object to dictionary."""
        return {
            'name': product.name,
            'description': product.description,
            'price': product.price,
            'category': product.category,
            'subcategory': product.subcategory,
            'brand': product.brand,
            'url': product.url,
            'rating': product.rating,
            'review_count': product.review_count,
            'scraped_at': product.scraped_at.strftime('%Y-%m-%d %H:%M:%S')
        }

    def save_to_csv(self, results: List[Dict[str, Any]], output_file: str = 'amazon_products.csv'):
        """Save results to CSV and Excel files."""
        if not results:
            self.logger.error("No results to save")
            return

        try:
            df = pd.DataFrame(results)
            
            # Save CSV
            df.to_csv(output_file, index=False)
            
            # Save Excel
            excel_file = output_file.replace('.csv', '.xlsx')
            df.to_excel(excel_file, index=False)
            
            self.logger.info(f"Saved {len(results)} records to {output_file} and {excel_file}")
            
        except Exception as e:
            self.logger.error(f"Error saving results: {str(e)}")
            raise

async def main():
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('amazon_scraper.log'),
            logging.StreamHandler()
        ]
    )
    
    # Initialize and run scraper
    scraper = AmazonScraper(max_threads=12)
    try:
        results = await scraper.scrape_all_categories()
        print(f"Processed {len(results)} products")
        
        # Save results
        scraper.save_to_csv(results)
            
    except Exception as e:
        logging.error(f"Scraping failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())