import pandas as pd
import tkinter as tk
from tkinter import filedialog, messagebox
from tkinter import ttk
import os

class ColumnConsolidatorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("File Column Consolidator")
        self.root.geometry("600x400")
        
        # Create main frame with padding
        main_frame = ttk.Frame(root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Input file selection
        ttk.Label(main_frame, text="Input File (CSV/Excel):").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.input_path = tk.StringVar()
        ttk.Entry(main_frame, textvariable=self.input_path, width=50).grid(row=0, column=1, padx=5)
        ttk.Button(main_frame, text="Browse", command=self.browse_input).grid(row=0, column=2)
        
        # Output file selection
        ttk.Label(main_frame, text="Output File (CSV/Excel):").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.output_path = tk.StringVar()
        ttk.Entry(main_frame, textvariable=self.output_path, width=50).grid(row=1, column=1, padx=5)
        ttk.Button(main_frame, text="Browse", command=self.browse_output).grid(row=1, column=2)
        
        # Process button
        ttk.Button(main_frame, text="Process File", command=self.process_file).grid(row=2, column=1, pady=20)
        
        # Progress bar
        self.progress = ttk.Progressbar(main_frame, length=400, mode='indeterminate')
        self.progress.grid(row=3, column=0, columnspan=3, pady=10)
        
        # Status label
        self.status_var = tk.StringVar()
        self.status_var.set("Ready to process...")
        ttk.Label(main_frame, textvariable=self.status_var).grid(row=4, column=0, columnspan=3)

    def browse_input(self):
        filename = filedialog.askopenfilename(
            title="Select Input File",
            filetypes=[
                ("All Supported Files", "*.csv *.xlsx *.xls"),
                ("CSV files", "*.csv"),
                ("Excel files", "*.xlsx *.xls")
            ]
        )
        if filename:
            self.input_path.set(filename)
            # Automatically set a default output path with same format as input
            base_name = os.path.basename(filename)
            file_ext = os.path.splitext(base_name)[1]
            output_name = f"consolidated_{base_name}"
            self.output_path.set(os.path.join(os.path.dirname(filename), output_name))

    def browse_output(self):
        filename = filedialog.asksaveasfilename(
            title="Select Output File",
            filetypes=[
                ("CSV files", "*.csv"),
                ("Excel files", "*.xlsx")
            ],
            defaultextension=".csv"
        )
        if filename:
            self.output_path.set(filename)

    def consolidate_columns(self, df):
        """Consolidate and rename similar columns in the DataFrame"""
        # Column mapping definition
        column_mapping = {
            'name': ['title', 'product_name', 'name'],
            'mrp': ['price', 'price_original', 'mrp'],
            'our_price': ['price_discount', 'dmart_price']
        }
        
        # Function to merge columns with priority
        def merge_columns(row, col_list):
            for col in col_list:
                if col in row and pd.notna(row[col]):
                    return row[col]
            return None
        
        # Create new consolidated DataFrame
        new_df = pd.DataFrame()
        
        # Process each group of similar columns
        for new_col, old_cols in column_mapping.items():
            existing_cols = [col for col in old_cols if col in df.columns]
            if existing_cols:
                new_df[new_col] = df.apply(lambda row: merge_columns(row, existing_cols), axis=1)
        
        # Copy over all other columns that weren't consolidated
        all_mapped_cols = [col for cols in column_mapping.values() for col in cols]
        other_cols = [col for col in df.columns if col not in all_mapped_cols]
        for col in other_cols:
            new_df[col] = df[col]
        
        return new_df

    def read_file(self, file_path):
        """Read input file based on extension"""
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext == '.csv':
            return pd.read_csv(file_path)
        else:
            return pd.read_excel(file_path)

    def save_file(self, df, file_path):
        """Save file based on extension"""
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext == '.csv':
            df.to_csv(file_path, index=False)
        else:
            df.to_excel(file_path, index=False)

    def process_file(self):
        if not self.input_path.get() or not self.output_path.get():
            messagebox.showerror("Error", "Please select both input and output files.")
            return
        
        try:
            self.progress.start()
            self.status_var.set("Processing...")
            self.root.update()
            
            # Read input file
            df = self.read_file(self.input_path.get())
            
            # Process the DataFrame
            processed_df = self.consolidate_columns(df)
            
            # Save to output file
            self.save_file(processed_df, self.output_path.get())
            
            self.progress.stop()
            self.status_var.set("Processing complete!")
            messagebox.showinfo("Success", "File has been processed successfully!")
            
        except Exception as e:
            self.progress.stop()
            self.status_var.set("Error occurred during processing!")
            messagebox.showerror("Error", f"An error occurred: {str(e)}")

def main():
    root = tk.Tk()
    app = ColumnConsolidatorApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()