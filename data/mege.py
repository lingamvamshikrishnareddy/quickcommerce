import tkinter as tk
from tkinter import filedialog, ttk
import pandas as pd
import os

def select_input_files():
    """Open a file dialog to select multiple CSV files."""
    filenames = filedialog.askopenfilenames(filetypes=[("CSV files", "*.csv")])
    if filenames:
        input_label.config(text=f"{len(filenames)} files selected")
        return filenames
    return []

def select_output_file():
    """Open a file dialog to select an output CSV file location."""
    filename = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV files", "*.csv")])
    if filename:
        output_label.config(text=os.path.basename(filename))
        return filename
    return ""

def combine_csv_files():
    """Combine selected input CSV files into a single output CSV file."""
    if not input_files or not output_file:
        status_label.config(text="Please select input and output files.")
        return

    try:
        # Read and concatenate all input files
        combined_df = pd.concat([pd.read_csv(file) for file in input_files])

        # Save to the output file
        combined_df.to_csv(output_file, index=False)
        
        status_label.config(text="Files combined successfully!")
    except Exception as e:
        status_label.config(text=f"Error: {e}")

# Initialize the Tkinter app
root = tk.Tk()
root.title("CSV File Combiner")
root.geometry("400x200")

# Input file selection
input_files = []
input_label = ttk.Label(root, text="No files selected")
input_label.pack(pady=5)
ttk.Button(root, text="Select Input CSV Files", command=lambda: input_files.extend(select_input_files())).pack()

# Output file selection
output_file = ""
output_label = ttk.Label(root, text="No output file selected")
output_label.pack(pady=5)
ttk.Button(root, text="Select Output File", command=lambda: globals().update(output_file=select_output_file())).pack()

# Combine button
combine_button = ttk.Button(root, text="Combine CSV Files", command=combine_csv_files)
combine_button.pack(pady=10)

# Status label
status_label = ttk.Label(root, text="Ready")
status_label.pack(pady=5)

# Run the Tkinter main loop
root.mainloop()
