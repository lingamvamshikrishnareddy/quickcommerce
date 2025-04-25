import tkinter as tk
from tkinter import filedialog, ttk
import pandas as pd
import threading
import time
import os
import uuid
import re
import logging
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ProductDataConverter:
    def __init__(self, root):
        self.root = root
        self.root.title("MongoDB Product Data Uniquifier")
        self.root.geometry("800x600")
        
        # Variables
        self.input_file_path = tk.StringVar()
        self.status = tk.StringVar()
        self.progress_var = tk.StringVar(value="0%")
        self.thread_count = 12
        self.id_strategy = tk.StringVar(value="uuid")
        self.fix_slugs = tk.BooleanVar(value=True)
        
        # Create UI
        self.create_widgets()
    
    def create_widgets(self):
        # File selection
        file_frame = ttk.Frame(self.root, padding="10")
        file_frame.pack(fill="x", expand=False, pady=10)
        
        ttk.Label(file_frame, text="CSV File:").grid(row=0, column=0, sticky="w", padx=5, pady=5)
        ttk.Entry(file_frame, textvariable=self.input_file_path, width=50).grid(row=0, column=1, padx=5, pady=5)
        ttk.Button(file_frame, text="Browse...", command=self.browse_file).grid(row=0, column=2, padx=5, pady=5)
        
        # Options frame
        options_frame = ttk.LabelFrame(self.root, text="Conversion Options", padding="10")
        options_frame.pack(fill="x", expand=False, pady=10, padx=10)
        
        # ID Strategy selection
        strategy_frame = ttk.Frame(options_frame)
        strategy_frame.pack(fill="x", expand=False, pady=5)
        
        ttk.Label(strategy_frame, text="ID Generation Strategy:").pack(side="left", padx=5)
        
        ttk.Radiobutton(
            strategy_frame, 
            text="UUID-based (most unique)",
            variable=self.id_strategy, 
            value="uuid"
        ).pack(side="left", padx=5)
        
        ttk.Radiobutton(
            strategy_frame, 
            text="Product-hash based",
            variable=self.id_strategy, 
            value="hash"
        ).pack(side="left", padx=5)
        
        ttk.Radiobutton(
            strategy_frame, 
            text="Sequential numbers",
            variable=self.id_strategy, 
            value="sequential"
        ).pack(side="left", padx=5)
        
        # Slug fix option
        slug_frame = ttk.Frame(options_frame)
        slug_frame.pack(fill="x", expand=False, pady=5)
        
        ttk.Checkbutton(
            slug_frame,
            text="Fix duplicate slugs (make them unique)",
            variable=self.fix_slugs
        ).pack(side="left", padx=5)
        
        # Control buttons
        btn_frame = ttk.Frame(self.root, padding="10")
        btn_frame.pack(fill="x", expand=False, pady=5)
        
        ttk.Button(btn_frame, text="Convert Data & Fix Duplicates", command=self.start_conversion).pack(side="left", padx=5)
        
        # Status and progress
        status_frame = ttk.Frame(self.root, padding="10")
        status_frame.pack(fill="x", expand=False, pady=5)
        
        ttk.Label(status_frame, text="Status:").pack(side="left", padx=5)
        ttk.Label(status_frame, textvariable=self.status).pack(side="left", padx=5)
        
        # Progress bar
        progress_frame = ttk.Frame(self.root, padding="10")
        progress_frame.pack(fill="x", expand=False, pady=5)
        
        self.progress_bar = ttk.Progressbar(progress_frame, orient="horizontal", length=700, mode="determinate")
        self.progress_bar.pack(side="top", fill="x", padx=5, pady=5)
        
        ttk.Label(progress_frame, textvariable=self.progress_var).pack(side="top", padx=5)
        
        # Results area
        result_frame = ttk.Frame(self.root, padding="10")
        result_frame.pack(fill="both", expand=True, pady=5)
        
        ttk.Label(result_frame, text="Log:").pack(side="top", anchor="w")
        
        self.log_text = tk.Text(result_frame, height=15, width=90)
        self.log_text.pack(side="left", fill="both", expand=True, padx=5, pady=5)
        
        scrollbar = ttk.Scrollbar(result_frame, orient="vertical", command=self.log_text.yview)
        scrollbar.pack(side="right", fill="y")
        self.log_text.configure(yscrollcommand=scrollbar.set)
    
    def browse_file(self):
        filename = filedialog.askopenfilename(
            title="Select CSV file",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
        )
        if filename:
            self.input_file_path.set(filename)
            self.log(f"Selected file: {filename}")
    
    def log(self, message):
        self.log_text.insert(tk.END, f"{message}\n")
        self.log_text.see(tk.END)
        logger.info(message)
    
    def start_conversion(self):
        if not self.input_file_path.get():
            self.log("Error: No input file selected")
            return
        
        # Reset UI
        self.progress_bar["value"] = 0
        self.progress_var.set("0%")
        self.status.set("Processing...")
        
        # Start conversion in a separate thread to keep UI responsive
        threading.Thread(target=self.process_csv, daemon=True).start()
    
    def process_csv(self):
        try:
            input_path = self.input_file_path.get()
            self.log(f"Loading CSV file: {input_path}")
            
            # Read the CSV file
            df = pd.read_csv(input_path)
            self.input_df = df  # Store for progress calculation
            total_rows = len(df)
            self.log(f"Loaded {total_rows} rows")
            
            # Fix IDs
            self.process_ids(df)
            
            # Fix slugs if needed
            if self.fix_slugs.get() and 'slug' in df.columns:
                self.process_slugs(df)
            
            # Save to new file
            output_file = os.path.splitext(input_path)[0] + "_fixed.csv"
            df.to_csv(output_file, index=False)
            
            self.log(f"Saved data with unique values to: {output_file}")
            self.log("IMPORTANT: The data has been processed to ensure unique values for indexed fields.")
            self.log("You can now safely import this file into MongoDB.")
            self.status.set("Completed")
            
            # Update progress to 100%
            self.root.after(0, lambda: self.progress_bar.configure(value=100))
            self.root.after(0, lambda: self.progress_var.set("100%"))
            
        except Exception as e:
            self.log(f"Error: {str(e)}")
            import traceback
            self.log(traceback.format_exc())
            self.status.set("Failed")
    
    def process_ids(self, df):
        # Check if '_id' column exists
        if '_id' not in df.columns:
            self.log("Warning: No '_id' column found. One will be created.")
        else:
            self.log("Processing '_id' field to ensure uniqueness...")
        
        # Store original IDs for reference
        if '_id' in df.columns:
            df['_original_id'] = df['_id'].copy()
        
        # Assign unique IDs based on selected strategy
        strategy = self.id_strategy.get()
        self.log(f"Using ID generation strategy: {strategy}")
        
        # Generate new unique IDs
        if strategy == "uuid":
            # Use the hex representation of a UUID, take first 8 chars and convert to int
            df['_id'] = [int(str(uuid.uuid4().hex)[:8], 16) for _ in range(len(df))]
            self.log("Generated UUID-based unique IDs")
        
        elif strategy == "hash":
            # Use hash of product details to generate unique IDs
            key_fields = [col for col in ['name', 'productId', 'title', 'sku'] if col in df.columns]
            
            if key_fields:
                # Create a unique string from available fields
                df['_hash_key'] = df.apply(
                    lambda row: '-'.join([str(row[f]) for f in key_fields if pd.notna(row[f])]), 
                    axis=1
                )
                # Use hash for uniqueness but ensure positive numbers only
                df['_id'] = [abs(hash(s)) % (2**31) for s in df['_hash_key']]
                df.drop('_hash_key', axis=1, inplace=True)
                self.log(f"Generated hash-based IDs using fields: {', '.join(key_fields)}")
            else:
                # Fallback to row number + timestamp if no identifying fields
                base = int(time.time())
                df['_id'] = [base + i + 1 for i in range(len(df))]
                self.log("No product identifiers found, generated timestamp-based IDs")
        
        elif strategy == "sequential":
            # Simple sequential IDs
            start_id = 1000000  # Start with a large number to avoid collisions
            df['_id'] = range(start_id, start_id + len(df))
            self.log("Generated sequential numeric IDs")
        
        # Check for any duplicates in the new IDs
        dup_count = df['_id'].duplicated().sum()
        if dup_count > 0:
            self.log(f"WARNING: {dup_count} duplicate IDs detected. Fixing...")
            # Identify duplicates and regenerate their IDs
            dup_mask = df['_id'].duplicated(keep='first')
            dup_indices = df[dup_mask].index
            # Generate new IDs for duplicates by adding a large offset
            offset = max(df['_id']) + 1
            for i, idx in enumerate(dup_indices):
                df.at[idx, '_id'] = offset + i
            
            # Verify uniqueness
            final_dup_count = df['_id'].duplicated().sum()
            if final_dup_count > 0:
                self.log(f"ERROR: Still found {final_dup_count} duplicates in IDs.")
            else:
                self.log("Successfully resolved duplicate IDs")
        else:
            self.log("Verified: All generated IDs are unique")

    def process_slugs(self, df):
        self.log("Processing 'slug' field to ensure uniqueness...")
        
        # Check if slug column exists
        if 'slug' not in df.columns:
            self.log("Warning: No 'slug' column found. Skipping slug processing.")
            return
        
        # Store original slugs for reference
        df['_original_slug'] = df['slug'].copy()
        
        # Check for duplicates
        duplicate_slugs = df[df['slug'].duplicated(keep=False)]['slug'].unique()
        dup_count = len(duplicate_slugs)
        
        if dup_count > 0:
            self.log(f"Found {dup_count} duplicate slug values. Fixing...")
            
            # Process each duplicate slug
            for dup_slug in duplicate_slugs:
                # Get all rows with this slug
                dup_mask = df['slug'] == dup_slug
                dup_indices = df[dup_mask].index
                
                # Keep first occurrence unchanged, update others
                for i, idx in enumerate(dup_indices[1:], 1):
                    # Generate a unique suffix
                    unique_suffix = f"-{i}"
                    
                    # Create new slug
                    original_slug = df.at[idx, 'slug']
                    df.at[idx, 'slug'] = f"{original_slug}{unique_suffix}"
                    
                    # Also update apiEndpoint and apiQuery if they exist and contain the slug
                    if 'apiEndpoint' in df.columns:
                        old_endpoint = df.at[idx, 'apiEndpoint']
                        if old_endpoint and dup_slug in old_endpoint:
                            df.at[idx, 'apiEndpoint'] = old_endpoint.replace(dup_slug, df.at[idx, 'slug'])
                    
                    if 'apiQuery' in df.columns and isinstance(df.at[idx, 'apiQuery'], dict):
                        api_query = df.at[idx, 'apiQuery']
                        if 'bySlug' in api_query and dup_slug in api_query['bySlug']:
                            api_query['bySlug'] = api_query['bySlug'].replace(dup_slug, df.at[idx, 'slug'])
                            df.at[idx, 'apiQuery'] = api_query
            
            # Verify slug uniqueness
            final_dup_count = df['slug'].duplicated().sum()
            if final_dup_count > 0:
                self.log(f"ERROR: Still found {final_dup_count} duplicate slugs after processing.")
            else:
                self.log("Successfully resolved all duplicate slugs")
                
            # Update searchKeywords if they contain the slug
            if 'searchKeywords' in df.columns:
                self.log("Updating searchKeywords to reflect new slugs...")
                
                def update_keywords(row):
                    if not isinstance(row['searchKeywords'], list):
                        return row['searchKeywords']
                    
                    keywords = row['searchKeywords']
                    if row['_original_slug'] in keywords and row['_original_slug'] != row['slug']:
                        # Replace the old slug with the new one in keywords
                        keywords = [kw if kw != row['_original_slug'] else row['slug'] for kw in keywords]
                    return keywords
                
                df['searchKeywords'] = df.apply(update_keywords, axis=1)
        else:
            self.log("Verified: All slugs are already unique")
            # Remove the temporary column if no changes were made
            df.drop('_original_slug', axis=1, inplace=True)

if __name__ == "__main__":
    root = tk.Tk()
    app = ProductDataConverter(root)
    root.mainloop()