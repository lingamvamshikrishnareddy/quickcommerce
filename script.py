import os
import time
import threading
from queue import Queue
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from PIL import Image
from io import BytesIO
import requests
from tkinter import Tk, filedialog

# Select folder to save images using Tinker
def select_folder():
    root = Tk()
    root.withdraw()  # Hide the main Tinker window
    folder = filedialog.askdirectory(title="Select Folder to Save Images")
    root.destroy()
    return folder

output_dir = select_folder()
if not output_dir:
    print("No folder selected. Exiting.")
    exit()

# Configure WebDriver
chrome_options = Options()
chrome_options.add_argument("--headless")  # Run in headless mode
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")

driver_path = r"C:\Users\linga\chromedriver-win64\chromedriver.exe"
service = Service(driver_path)
driver = webdriver.Chrome(service=service, options=chrome_options)

# URL to scrape
url = "https://www.amazon.in/s?k=grocery"  # Update for your needs
driver.get(url)
time.sleep(5)  # Allow the page to load

# Scroll to load more images
for _ in range(20):  # Increase scroll count to load more products
    driver.execute_script("window.scrollBy(0, 1000);")
    time.sleep(2)

# Find image elements
image_elements = driver.find_elements(By.TAG_NAME, "img")
image_urls = [img.get_attribute("src") for img in image_elements if img.get_attribute("src") and img.get_attribute("src").startswith("http")]
driver.quit()

# Maximum thread count
thread_count = 12

# Worker function for downloading images
def download_images(q, output_dir):
    while not q.empty():
        idx, url = q.get()
        try:
            response = requests.get(url, timeout=10)
            img_data = Image.open(BytesIO(response.content))
            img_format = img_data.format.lower()
            img_path = os.path.join(output_dir, f"image_{idx}.{img_format}")
            img_data.save(img_path)
            print(f"Saved: {img_path}")
        except Exception as e:
            print(f"Failed to save image {idx}: {e}")
        finally:
            q.task_done()

# Use a queue to manage URLs
queue = Queue()
for idx, url in enumerate(image_urls[:10000], 1):  # Limit to 10,000 images
    queue.put((idx, url))

# Start threads
threads = []
for _ in range(thread_count):
    t = threading.Thread(target=download_images, args=(queue, output_dir))
    t.start()
    threads.append(t)

# Wait for all threads to finish
queue.join()
for t in threads:
    t.join()

print("Image scraping complete.")
