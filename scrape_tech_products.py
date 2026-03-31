import os
import json
import requests
import uuid

# Define tech categories (DummyJSON API categories)
TECH_CATEGORIES = [
    "smartphones", "laptops", "tablets", "mobile-accessories", 
    "tablets", "smartbands", "smartwatches", "audio"
]

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def download_image(url, save_path):
    try:
        response = requests.get(url, stream=True, timeout=10)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
    return False

def scrape_products():
    base_dir = "scraped_data"
    images_dir = os.path.join(base_dir, "images")
    ensure_dir(images_dir)

    all_tech_products = []
    # Fetch broadly to find tech products
    print("Fetching from DummyJSON...")
    response = requests.get("https://dummyjson.com/products?limit=200")
    if response.status_code != 200:
        print("Failed to fetch products.")
        return

    products_data = response.json().get("products", [])
    
    # Filter tech products
    for p in products_data:
        if p["category"] in TECH_CATEGORIES or "pc" in p["category"].lower() or "electronic" in p["category"].lower():
            all_tech_products.append(p)
            
    # We might need to fetch more if < 100, but let's see how many we got.
    print(f"Found {len(all_tech_products)} base tech products from main list.")
    
    # Let's specifically fetch from categories if we need more
    if len(all_tech_products) < 100:
        for cat in TECH_CATEGORIES:
            res = requests.get(f"https://dummyjson.com/products/category/{cat}?limit=50")
            if res.status_code == 200:
                cat_products = res.json().get("products", [])
                for cp in cat_products:
                    if not any(x['id'] == cp['id'] for x in all_tech_products):
                        all_tech_products.append(cp)
                        
    print(f"Total collected tech products: {len(all_tech_products)}")
    
    formatted_products = []
    target_count = 100
    base_count = len(all_tech_products)
    
    # We will generate variations if we don't have enough unique tech products
    if base_count == 0:
        print("No tech products found! Cannot proceed.")
        return

    for i in range(target_count):
        base_p = all_tech_products[i % base_count]
        variant_num = (i // base_count) + 1
        
        prod_id = str(uuid.uuid4())
        
        prod_img_dir = os.path.join(images_dir, prod_id)
        ensure_dir(prod_img_dir)
        
        saved_images = []
        # Download images (up to 6)
        images = base_p.get("images", [])[:6]
        for idx, img_url in enumerate(images):
            ext = img_url.split('.')[-1]
            if len(ext) > 5 or '?' in ext:
                ext = 'jpg'
            img_filename = f"{idx+1}.{ext}"
            img_path = os.path.join(prod_img_dir, img_filename)
            
            if download_image(img_url, img_path):
                # We store the relative path
                saved_images.append(f"images/{prod_id}/{img_filename}")
        
        # Modify the name if it's a variant
        name = base_p.get("title", "Unknown")
        if variant_num > 1:
            name = f"{name} - Variant {variant_num}"
            
        product_item = {
            "name": name,
            "model": f"{base_p.get('sku', 'Model')}-V{variant_num}",
            "serial_number": str(uuid.uuid4()),
            "description": base_p.get("description", ""),
            "stock_quantity": base_p.get("stock", 0) + variant_num * 10,
            "price": float(base_p.get("price", 0.0)) + (variant_num - 1) * 10.0,
            "warranty": base_p.get("warrantyInformation", "1 Year Warranty"),
            "distributor": base_p.get("brand", "Generic Distributor") or "Generic Distributor",
            "category_id": base_p.get("category", "tech"),
            "image_url": saved_images[0] if saved_images else None,
            "all_images": saved_images # Storing array of 1-6 photos as requested
        }
        formatted_products.append(product_item)
        print(f"Scraped ({i+1}/{target_count}): {product_item['name']} with {len(saved_images)} photos.")
        
    # Save the JSON data
    json_path = os.path.join(base_dir, "products.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(formatted_products, f, indent=4, ensure_ascii=False)
        
    print(f"\nScraping complete! Data saved to {json_path}")
    print(f"Total products formatted: {len(formatted_products)}")

if __name__ == "__main__":
    scrape_products()
