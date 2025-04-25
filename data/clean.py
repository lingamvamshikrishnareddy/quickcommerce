import pandas as pd
import tkinter as tk
from tkinter import filedialog
import threading

def clean_data(input_file, output_file):
    # Read the CSV file into a DataFrame
    df = pd.read_csv(input_file)

    # Define a mapping for duplicate or similar column names
    duplicate_columns = {
        "title": "Title",
        "category": "Category",
        "subcategory": "Subcategory",
        "sub category": "Subcategory",
        "quantity": "Quantity",
        "price": "Price",
        "mrp": "MRP",
        "dmart price": "DMart Price",
        "DMart Price": "DMart Price",  # Normalize case
    }

    # Normalize and merge columns
    for col, target_col in duplicate_columns.items():
        if target_col in df.columns:
            if col in df.columns:
                df[target_col] = df[target_col].combine_first(df[col])
                df.drop(columns=[col], inplace=True)
        elif col in df.columns:
            df.rename(columns={col: target_col}, inplace=True)

    # Merge all price columns into 'MRP'
    price_columns = ['Price', 'mrp', 'mrp.', 'Mrp']
    for price_col in price_columns:
        if price_col in df.columns:
            if 'MRP' not in df.columns:
                df['MRP'] = None
            df['MRP'] = df['MRP'].combine_first(df[price_col])
            df.drop(columns=[price_col], inplace=True)

    # Handle missing 'Unit' and 'Quantity' columns gracefully
    if 'Unit' not in df.columns:
        df['Unit'] = None
    if 'Quantity' not in df.columns:
        df['Quantity'] = None

    # Clean up the 'Unit' and 'Quantity' columns
    for index, row in df.iterrows():
        if isinstance(row['Unit'], str):
            unit_value = row['Unit'].strip().lower()
            if unit_value in ['kg', 'grams', 'litre', 'ml']:
                df.at[index, 'Unit'] = unit_value

        if isinstance(row['Quantity'], str):
            quantity_value = row['Quantity'].strip().lower()
            if quantity_value not in ['kg', 'grams', 'litre', 'ml']:
                df.at[index, 'Quantity'] = quantity_value
                df.at[index, 'Unit'] = None

    # Keep only required columns: Title, Category, Subcategory, MRP, Quantity, Unit
    required_columns = ['Title', 'Category', 'Subcategory', 'MRP', 'Quantity', 'Unit']
    for col in required_columns:
        if col not in df.columns:
            df[col] = None

    df = df[required_columns]

    # Drop any completely empty or unnamed columns
    df.dropna(axis=1, how="all", inplace=True)
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

    # Save the cleaned DataFrame to a new CSV file
    df.to_csv(output_file, index=False)
    print(f"Cleaned data saved to {output_file}")


def threaded_clean_data(input_file, output_file, thread_count=1):
    # Multithreading support for large files
    threads = []
    for _ in range(thread_count):
        thread = threading.Thread(target=clean_data, args=(input_file, output_file))
        threads.append(thread)
        thread.start()

    for thread in threads:
        thread.join()

def main():
    root = tk.Tk()
    root.withdraw()

    input_file = filedialog.askopenfilename(title="Select Input CSV File")
    if not input_file:
        print("No input file selected.")
        return

    output_file = filedialog.asksaveasfilename(defaultextension=".csv", title="Save Cleaned CSV File As")
    if not output_file:
        print("No output file specified.")
        return

    threaded_clean_data(input_file, output_file, thread_count=1)  # Default thread count is 1

if __name__ == "__main__":
    main()
