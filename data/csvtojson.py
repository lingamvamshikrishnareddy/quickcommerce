import tkinter as tk
from tkinter import filedialog, ttk, messagebox
import pandas as pd
import json
from bson import ObjectId
import threading
import queue
import math
import os
from datetime import datetime
import re
import hashlib
import uuid
import logging

class ProductConverter:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("CSV to MongoDB JSON Converter")
        self.root.geometry("800x600")
        
        # Initialize containers
        self.used_slugs = {}  # Keep track of used slugs and their count
        self.category_counters = {}
        self.used_skus = set()
        self.error_log = []
        self.queue = queue.Queue()
        self.num_threads = 12
        
        # Setup logging
        self.setup_logging()
        self.setup_ui()
        
    def setup_logging(self):
        """Configure logging for the application"""
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, f"conversion_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        
    def setup_ui(self):
        # Create main frame
        self.main_frame = ttk.Frame(self.root, padding="10")
        self.main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # File selection
        self.file_path = tk.StringVar()
        ttk.Label(self.main_frame, text="Select CSV File:").grid(row=0, column=0, pady=5)
        ttk.Entry(self.main_frame, textvariable=self.file_path, width=50).grid(row=0, column=1, pady=5)
        ttk.Button(self.main_frame, text="Browse", command=self.browse_file).grid(row=0, column=2, pady=5)
        
        # Output directory selection
        self.output_path = tk.StringVar()
        ttk.Label(self.main_frame, text="Output Directory:").grid(row=1, column=0, pady=5)
        ttk.Entry(self.main_frame, textvariable=self.output_path, width=50).grid(row=1, column=1, pady=5)
        ttk.Button(self.main_frame, text="Browse", command=self.browse_output).grid(row=1, column=2, pady=5)
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(self.main_frame, length=600, mode='determinate', variable=self.progress_var)
        self.progress_bar.grid(row=2, column=0, columnspan=3, pady=10)
        
        # Status label
        self.status_var = tk.StringVar()
        self.status_var.set("Ready to convert")
        ttk.Label(self.main_frame, textvariable=self.status_var).grid(row=3, column=0, columnspan=3)
        
        # Convert button
        self.convert_btn = ttk.Button(self.main_frame, text="Convert", command=self.start_conversion)
        self.convert_btn.grid(row=4, column=0, columnspan=3, pady=10)
        
        # Error log text area with scrollbar
        error_frame = ttk.Frame(self.main_frame)
        error_frame.grid(row=5, column=0, columnspan=3, pady=10)
        
        scrollbar = ttk.Scrollbar(error_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.error_text = tk.Text(error_frame, height=15, width=70, yscrollcommand=scrollbar.set)
        self.error_text.pack(side=tk.LEFT, fill=tk.BOTH)
        scrollbar.config(command=self.error_text.yview)

    def validate_csv_file(self, file_path):
        """Validate CSV file structure and required columns"""
        if not os.path.exists(file_path):
            raise ValueError("CSV file does not exist")
            
        try:
            df = pd.read_csv(file_path)
            required_columns = ['title', 'category', 'mrp', 'quantity']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
                
            return df
            
        except pd.errors.EmptyDataError:
            raise ValueError("CSV file is empty")
        except pd.errors.ParserError:
            raise ValueError("Invalid CSV file format")

    def validate_row_data(self, row):
        """Validate individual row data"""
        errors = []
        
        # Check title
        if pd.isna(row.get('title')) or not str(row.get('title')).strip():
            errors.append("Title is required")
            
        # Check category
        if pd.isna(row.get('category')) or not str(row.get('category')).strip():
            errors.append("Category is required")
            
        # Check MRP
        try:
            mrp = float(row.get('mrp', 0))
            if mrp < 0:
                errors.append("MRP cannot be negative")
        except (ValueError, TypeError):
            errors.append("Invalid MRP value")
            
        # Check quantity
        try:
            quantity = int(row.get('quantity', 0))
            if quantity < 0:
                errors.append("Quantity cannot be negative")
        except (ValueError, TypeError):
            errors.append("Invalid quantity value")
            
        return errors

    def generate_sku(self, category, title, index):
        """Generate unique SKU for product"""
        if pd.isna(category) or pd.isna(title):
            base_sku = f"PROD{index:06d}"
        else:
            base_sku = f"{self.sanitize_string(category)[:3]}{self.sanitize_string(title)[:3]}{index:06d}"
            
        while base_sku in self.used_skus:
            index += 1
            base_sku = f"{self.sanitize_string(category)[:3]}{self.sanitize_string(title)[:3]}{index:06d}"
            
        self.used_skus.add(base_sku)
        return base_sku.upper()

    def generate_product_id(self, category, title, index):
        """Generate unique product ID"""
        base_string = f"{category}-{title}-{index}"
        return f"PROD-{hashlib.md5(base_string.encode()).hexdigest()[:8].upper()}"

    def log_error(self, error_msg):
        """Log error message to both file and UI"""
        logging.error(error_msg)
        self.error_text.insert(tk.END, f"{error_msg}\n")
        self.error_text.see(tk.END)

    def start_conversion(self):
        """Start the conversion process with validation"""
        self.error_text.delete(1.0, tk.END)
        self.progress_var.set(0)
        self.convert_btn.config(state='disabled')
        
        try:
            if not self.file_path.get():
                raise ValueError("Please select a CSV file")
                
            if not self.output_path.get():
                raise ValueError("Please select an output directory")
                
            # Create output directory if it doesn't exist
            os.makedirs(self.output_path.get(), exist_ok=True)
            
            # Validate CSV file
            df = self.validate_csv_file(self.file_path.get())
            
            self.status_var.set("Starting conversion...")
            threading.Thread(target=self.convert_file, args=(df,), daemon=True).start()
            
        except Exception as e:
            self.log_error(f"Error starting conversion: {str(e)}")
            messagebox.showerror("Error", str(e))
            self.convert_btn.config(state='normal')

    def convert_file(self, df):
        """Convert CSV file to JSON with error handling"""
        try:
            total_rows = len(df)
            chunk_size = math.ceil(total_rows / self.num_threads)
            threads = []
            
            # Split data into chunks and process in parallel
            for i in range(0, total_rows, chunk_size):
                chunk = df.iloc[i:i + chunk_size]
                thread = threading.Thread(
                    target=self.process_chunk,
                    args=(chunk, i, self.queue)
                )
                thread.start()
                threads.append(thread)
            
            # Collect results
            all_products = []
            processed_chunks = 0
            
            while processed_chunks < len(threads):
                products, errors = self.queue.get()
                all_products.extend(products)
                
                if errors:
                    for error in errors:
                        self.log_error(error)
                
                processed_chunks += 1
                progress = (processed_chunks / len(threads)) * 100
                self.progress_var.set(progress)
                self.status_var.set(f"Processing... {progress:.1f}%")
            
            # Wait for all threads to complete
            for thread in threads:
                thread.join()
            
            # Save results
            if all_products:
                output_file = os.path.join(
                    self.output_path.get(),
                    f"products_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                )
                
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(all_products, f, indent=2, ensure_ascii=False)
                
                success_msg = f"Successfully converted {len(all_products)} products\nSaved to: {output_file}"
                self.status_var.set(success_msg)
                logging.info(success_msg)
                messagebox.showinfo("Success", success_msg)
            else:
                raise ValueError("No products were successfully converted")
                
        except Exception as e:
            error_msg = f"Error during conversion: {str(e)}"
            self.log_error(error_msg)
            self.status_var.set("Conversion failed")
            messagebox.showerror("Error", error_msg)
            
        finally:
            self.convert_btn.config(state='normal')

    def process_chunk(self, chunk, start_index, q):
        """Process a chunk of data with validation"""
        products = []
        errors = []
        
        for idx, row in chunk.iterrows():
            try:
                # Validate row data
                row_errors = self.validate_row_data(row)
                if row_errors:
                    errors.append(f"Row {start_index + idx}: {', '.join(row_errors)}")
                    continue
                
                # Safe conversion of numeric values
                mrp = float(row.get('mrp', 0))
                quantity = int(row.get('quantity', 0))
                
                # Basic validations
                category = str(row.get('category', 'Uncategorized')).strip()
                title = str(row.get('title')).strip()

                # Generate unique identifiers
                sku = self.generate_sku(category, title, start_index + idx)
                product_slug = self.generate_slug(category, title)
                product_id = self.generate_product_id(category, title, start_index + idx)

                # Create product document
                product = {
                    "_id": str(ObjectId()),
                    "productId": product_id,
                    "sku": sku,
                    "slug": product_slug,
                    "title": title,
                    "category": category,
                    "subCategory": row.get('subCategory', ''),
                    "quantity": {
                        "value": quantity,
                        "unit": str(row.get('unit', 'pcs'))
                    },
                    "pricing": {
                        "mrp": mrp,
                        "salePrice": round(mrp * 0.8, 2),
                        "discount": {
                            "percentage": 20,
                            "amount": round(mrp * 0.2, 2)
                        }
                    },
                    "searchKeywords": [
                        title.lower(),
                        category.lower(),
                        product_id.lower(),
                        product_slug,
                        sku.lower()
                    ],
                    "metadata": {
                        "createdAt": datetime.now().isoformat(),
                        "updatedAt": datetime.now().isoformat(),
                        "isActive": True,
                        "inStock": quantity > 0
                    },
                    "apiEndpoint": f"/api/products/{product_slug}",
                    "apiQuery": {
                        "byId": f"/api/products?productId={product_id}",
                        "bySlug": f"/api/products?slug={product_slug}",
                        "byCategory": f"/api/products?category={self.sanitize_string(category)}"
                    }
                }
                products.append(product)
                
            except Exception as e:
                errors.append(f"Error processing row {start_index + idx}: {str(e)}")
        
        q.put((products, errors))

    def browse_file(self):
        filename = filedialog.askopenfilename(filetypes=[("CSV Files", "*.csv")])
        if filename:
            self.file_path.set(filename)
            # Set default output directory
            if not self.output_path.get():
                default_output = os.path.join(os.path.dirname(filename), "output")
                self.output_path.set(default_output)
    
    def browse_output(self):
        directory = filedialog.askdirectory()
        if directory:
            self.output_path.set(directory)
            
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = ProductConverter()
    app.run()