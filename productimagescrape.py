import tkinter as tk
from tkinter import filedialog, ttk
import csv
import requests
from bs4 import BeautifulSoup
import threading
import queue
import os
from urllib.parse import quote
import re

class ProductImageScraperApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Enhanced Product Image Scraper")
        self.root.geometry("700x600")
        self.root.configure(padx=20, pady=20)
        
        # Set up queue for thread-safe operations
        self.queue = queue.Queue()
        
        # Variables
        self.input_file_path = tk.StringVar()
        self.output_file_path = tk.StringVar()
        self.thread_count = tk.IntVar(value=12)  # Default 12 threads
        self.progress_var = tk.DoubleVar(value=0)
        self.status_text = tk.StringVar(value="Ready to start.")
        
        # Create UI
        self.create_widgets()
        
        # Flag to track if processing is running
        self.is_running = False
        
    def create_widgets(self):
        # Input file section
        tk.Label(self.root, text="Input CSV File:").grid(row=0, column=0, sticky=tk.W, pady=5)
        tk.Entry(self.root, textvariable=self.input_file_path, width=60).grid(row=0, column=1, padx=5, pady=5)
        tk.Button(self.root, text="Browse...", command=self.browse_input_file).grid(row=0, column=2, padx=5, pady=5)
        
        # Output file section
        tk.Label(self.root, text="Output CSV File:").grid(row=1, column=0, sticky=tk.W, pady=5)
        tk.Entry(self.root, textvariable=self.output_file_path, width=60).grid(row=1, column=1, padx=5, pady=5)
        tk.Button(self.root, text="Browse...", command=self.browse_output_file).grid(row=1, column=2, padx=5, pady=5)
        
        # Manual input data option
        tk.Label(self.root, text="Or Paste Data:").grid(row=2, column=0, sticky=tk.W, pady=5)
        self.text_input = tk.Text(self.root, width=60, height=4)
        self.text_input.grid(row=2, column=1, columnspan=2, padx=5, pady=5)
        
        # Thread count section
        tk.Label(self.root, text="Number of Threads:").grid(row=3, column=0, sticky=tk.W, pady=5)
        thread_slider = tk.Scale(self.root, from_=1, to=20, orient=tk.HORIZONTAL, 
                                variable=self.thread_count, length=200)
        thread_slider.grid(row=3, column=1, sticky=tk.W, pady=5)
        
        # E-commerce source selection
        tk.Label(self.root, text="Search Sources:").grid(row=4, column=0, sticky=tk.W, pady=5)
        
        # Create a frame for the checkboxes
        source_frame = tk.Frame(self.root)
        source_frame.grid(row=4, column=1, sticky=tk.W)
        
        # Source checkboxes
        self.sources = {
            "dmart": tk.BooleanVar(value=True),  # DMart is most preferred
            "amazon": tk.BooleanVar(value=True),
            "zepto": tk.BooleanVar(value=True),
            "blinkit": tk.BooleanVar(value=True),
            "swiggy": tk.BooleanVar(value=True),
            "dunzo": tk.BooleanVar(value=True),
            "snapdeal": tk.BooleanVar(value=True)
        }
        
        # Layout checkboxes in two rows
        source_names = list(self.sources.keys())
        for i, name in enumerate(source_names[:4]):  # First row
            display_name = name.capitalize()
            tk.Checkbutton(source_frame, text=display_name, 
                          variable=self.sources[name]).grid(row=0, column=i, padx=5)
        
        for i, name in enumerate(source_names[4:]):  # Second row
            display_name = name.capitalize()
            tk.Checkbutton(source_frame, text=display_name, 
                          variable=self.sources[name]).grid(row=1, column=i, padx=5)
        
        # Process button
        tk.Button(self.root, text="Start Processing", command=self.start_processing, 
                 bg="#4CAF50", fg="white", padx=10, pady=5).grid(row=5, column=0, columnspan=3, pady=10)
        
        # Progress bar
        self.progress = ttk.Progressbar(self.root, variable=self.progress_var, length=660, mode="determinate")
        self.progress.grid(row=6, column=0, columnspan=3, pady=10)
        
        # Status label
        tk.Label(self.root, textvariable=self.status_text).grid(row=7, column=0, columnspan=3, pady=5)
        
        # Log area
        tk.Label(self.root, text="Processing Log:").grid(row=8, column=0, sticky=tk.W, pady=5)
        self.log_area = tk.Text(self.root, width=80, height=12)
        self.log_area.grid(row=9, column=0, columnspan=3, pady=5)
        
        # Add scrollbar to log area
        scrollbar = tk.Scrollbar(self.root, command=self.log_area.yview)
        scrollbar.grid(row=9, column=3, sticky=tk.NS)
        self.log_area.config(yscrollcommand=scrollbar.set)
    
    def browse_input_file(self):
        filename = filedialog.askopenfilename(filetypes=[("CSV Files", "*.csv"), ("Text Files", "*.txt"), ("All Files", "*.*")])
        if filename:
            self.input_file_path.set(filename)
            # Auto-set output filename based on input
            basename = os.path.basename(filename)
            output_name = f"processed_{basename}"
            output_path = os.path.join(os.path.dirname(filename), output_name)
            self.output_file_path.set(output_path)
    
    def browse_output_file(self):
        filename = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV Files", "*.csv")])
        if filename:
            self.output_file_path.set(filename)
    
    def update_log(self, message):
        self.queue.put(("log", message))
    
    def update_progress(self, value):
        self.queue.put(("progress", value))
    
    def update_status(self, message):
        self.queue.put(("status", message))
        
    def process_queue(self):
        try:
            while True:
                action, value = self.queue.get_nowait()
                if action == "log":
                    self.log_area.insert(tk.END, f"{value}\n")
                    self.log_area.see(tk.END)
                elif action == "progress":
                    self.progress_var.set(value)
                elif action == "status":
                    self.status_text.set(value)
                self.queue.task_done()
        except queue.Empty:
            pass
        finally:
            # Check queue again after 100ms
            if self.is_running:
                self.root.after(100, self.process_queue)
    
    def get_image_url_from_source(self, product_title, product_id, source):
        """Search for product images from a specific source."""
        query = quote(f"{product_title} product {source}")
        url = f"https://www.google.com/search?q={query}&tbm=isch"
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Accept-Language': 'en-US,en;q=0.9',
            }
            response = requests.get(url, headers=headers, timeout=5)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Get image tags
            img_tags = soup.find_all('img')
            # Skip the first image (Google logo)
            if len(img_tags) > 1:
                for i in range(1, min(5, len(img_tags))):  # Check first few images
                    img_url = img_tags[i].get('src')
                    if img_url and not img_url.startswith('data:'):
                        return img_url
        except Exception as e:
            self.update_log(f"Error for {product_title} on {source}: {str(e)}")
        
        return None
    
    def get_image_url(self, product_title, product_id, additional_keywords=None):
        """Search for product images online from multiple sources and return the URL."""
        # Get list of enabled sources in preferred order
        enabled_sources = [source for source, var in self.sources.items() if var.get()]
        
        if not enabled_sources:
            enabled_sources = ["dmart", "amazon"]  # Default if none selected
        
        # Try to find image from each source
        for source in enabled_sources:
            self.update_log(f"Searching for {product_title} on {source}")
            img_url = self.get_image_url_from_source(product_title, product_id, source)
            if img_url:
                self.update_log(f"Found image on {source}")
                return img_url
        
        # If no image found in preferred sources, try a generic search
        try:
            # Include additional keywords if provided
            search_terms = product_title
            if additional_keywords:
                search_terms = f"{product_title} {additional_keywords}"
                
            query = quote(f"{search_terms} product")
            url = f"https://www.google.com/search?q={query}&tbm=isch"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
            }
            response = requests.get(url, headers=headers, timeout=5)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            img_tags = soup.find_all('img')
            if len(img_tags) > 1:
                img_url = img_tags[1].get('src')
                if img_url and not img_url.startswith('data:'):
                    return img_url
                
                # Try another image if first one is not suitable
                for i in range(2, min(5, len(img_tags))):
                    img_url = img_tags[i].get('src')
                    if img_url and not img_url.startswith('data:'):
                        return img_url
            
            # Try Bing as a fallback
            bing_url = f"https://www.bing.com/images/search?q={query}&form=HDRSC2&first=1"
            bing_response = requests.get(bing_url, headers=headers, timeout=5)
            bing_soup = BeautifulSoup(bing_response.text, 'html.parser')
            bing_img = bing_soup.select_one('.mimg')
            if bing_img:
                return bing_img.get('src')
                
        except Exception as e:
            self.update_log(f"Error in generic search for {product_title}: {str(e)}")
        
        return None
    
    def parse_pasted_data(self, text_data):
        """Parse pasted data into a list of dictionaries."""
        records = []
        
        # Split by newline and process each line
        lines = text_data.strip().split('\n')
        
        # Try to detect header
        header_line = lines[0] if lines else ""
        if "*id" in header_line or "productId" in header_line:
            # Extract column names from header
            # Replace * with empty string and split by appropriate delimiter
            header = header_line.replace('*', '')
            
            # Try different delimiters
            if '\t' in header:
                columns = header.split('\t')
            elif ',' in header:
                columns = header.split(',')
            else:
                # If no clear delimiter, try splitting by variable whitespace
                columns = re.split(r'\s+', header)
            
            # Clean up column names
            columns = [col.strip() for col in columns if col.strip()]
            
            # Process data rows
            for i in range(1, len(lines)):
                line = lines[i].strip()
                if not line:
                    continue
                
                # Try same delimiter as header
                if '\t' in header:
                    parts = line.split('\t')
                elif ',' in header:
                    parts = line.split(',')
                else:
                    parts = re.split(r'\s+', line)
                
                # Create record with column names
                record = {}
                for j, part in enumerate(parts):
                    if j < len(columns):
                        record[columns[j]] = part.strip()
                    else:
                        # Extra parts without column names
                        record[f"column_{j}"] = part.strip()
                
                # Add image field
                record['image'] = ''
                records.append(record)
        else:
            # No header, create generic structure
            for line in lines:
                if not line.strip():
                    continue
                
                # Try to extract product information
                parts = re.split(r'\s{2,}|\t|,', line)
                if len(parts) >= 2:
                    record = {
                        'id': parts[0].strip(),
                        'productId': parts[0].strip(),
                        'title': parts[1].strip() if len(parts) > 1 else '',
                        'slug': parts[2].strip() if len(parts) > 2 else '',
                        'image': ''
                    }
                    records.append(record)
        
        return records
    
    def process_data(self, records):
        thread_count = self.thread_count.get()
        
        self.update_log(f"Found {len(records)} products to process")
        self.update_status(f"Processing {len(records)} products...")
        
        # Function to process each product
        def process_product(record, index, total):
            # Determine the primary fields to use for search
            product_id = record.get('productId', record.get('id', ''))
            product_title = record.get('title', record.get('name', ''))
            
            # Use slug if available, and category/subcategory as additional keywords
            slug = record.get('slug', '')
            category = record.get('category', '')
            subcategory = record.get('subCategory', '')
            
            # Combine search keywords
            additional_keywords = []
            if category:
                additional_keywords.append(category)
            if subcategory:
                additional_keywords.append(subcategory)
            
            # Also use any searchKeywords fields if available
            for i in range(5):  # Check for searchKeywords[0] through searchKeywords[4]
                keyword_field = f'searchKeywords[{i}]'
                if keyword_field in record and record[keyword_field]:
                    additional_keywords.append(record[keyword_field])
            
            additional_keywords_str = ' '.join(additional_keywords)
            
            if not record.get('image'):
                self.update_log(f"[{index+1}/{total}] Processing: {product_title} (ID: {product_id})")
                img_url = self.get_image_url(product_title, product_id, additional_keywords_str)
                
                if img_url:
                    record['image'] = img_url
                    self.update_log(f"✅ Found image for: {product_title}")
                else:
                    self.update_log(f"⚠️ No image found for: {product_title}")
            else:
                self.update_log(f"[{index+1}/{total}] Skipping: {product_title} (already has image URL)")
            
            # Update progress
            progress_value = ((index + 1) / total) * 100
            self.update_progress(progress_value)
        
        # Function to process a batch of products
        def process_batch(batch_records, start_index, total):
            for i, record in enumerate(batch_records):
                process_product(record, start_index + i, total)
        
        # Divide records into batches for threading
        total_records = len(records)
        batch_size = max(1, total_records // thread_count)
        threads = []
        
        for i in range(0, total_records, batch_size):
            end_index = min(i + batch_size, total_records)
            batch = records[i:end_index]
            thread = threading.Thread(
                target=process_batch, 
                args=(batch, i, total_records)
            )
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
            
        return records
    
    def process_csv(self):
        output_file = self.output_file_path.get()
        
        try:
            # Check if we're using pasted data or a file
            pasted_text = self.text_input.get("1.0", tk.END).strip()
            
            if pasted_text:
                self.update_status("Processing pasted data...")
                records = self.parse_pasted_data(pasted_text)
                if not records:
                    self.update_status("Could not parse the pasted data. Please check format.")
                    self.update_log("❌ Error: Could not parse the pasted data.")
                    return
            else:
                # Use file input
                input_file = self.input_file_path.get()
                if not input_file:
                    self.update_status("Please select an input file or paste data.")
                    return
                    
                self.update_status("Reading input CSV file...")
                self.update_log(f"Reading input file: {input_file}")
                
                # Read input CSV
                with open(input_file, 'r', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    records = list(reader)
            
            # Process the records
            processed_records = self.process_data(records)
            
            # Write output CSV
            self.update_status("Writing results to output file...")
            self.update_log(f"Writing results to output file: {output_file}")
            
            # Determine fieldnames
            if processed_records:
                # Keep all original fields and add image if not present
                fieldnames = list(processed_records[0].keys())
                if 'image' not in fieldnames:
                    fieldnames.append('image')
            else:
                # Default fieldnames
                fieldnames = ['id', 'productId', 'slug', 'title', 'category', 'subCategory', 'image']
            
            with open(output_file, 'w', encoding='utf-8', newline='') as file:
                writer = csv.DictWriter(file, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(processed_records)
            
            self.update_status("Processing complete!")
            self.update_log(f"✅ Done! Processed {len(processed_records)} products.")
            
        except Exception as e:
            self.update_status(f"Error: {str(e)}")
            self.update_log(f"❌ Error: {str(e)}")
        
        finally:
            self.is_running = False
    
    def start_processing(self):
        # Check if either file path or pasted data is provided
        if not self.input_file_path.get() and not self.text_input.get("1.0", tk.END).strip():
            self.update_status("Please select an input CSV file or paste data.")
            return
        
        if not self.output_file_path.get():
            self.update_status("Please select an output CSV file.")
            return
        
        # Clear log area
        self.log_area.delete(1.0, tk.END)
        self.progress_var.set(0)
        
        # Start processing in a new thread
        self.is_running = True
        self.process_queue()  # Start monitoring the queue
        
        process_thread = threading.Thread(target=self.process_csv)
        process_thread.daemon = True
        process_thread.start()

# Main execution
if __name__ == "__main__":
    root = tk.Tk()
    app = ProductImageScraperApp(root)
    root.mainloop()