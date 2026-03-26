import json
import os
import firebase_admin
from firebase_admin import credentials, firestore

def connect_to_firebase():
    cred_path = os.path.join(os.path.dirname(__file__), "firebase_credentials.json")
    if not os.path.exists(cred_path):
        print(f"Error: {cred_path} not found.")
        return None
        
    cred = credentials.Certificate(cred_path)
    # Check if already initialized (when hot-reloading etc)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
        
    return firestore.client()

def seed_products():
    db = connect_to_firebase()
    if not db:
        return

    json_path = os.path.join(os.path.dirname(__file__), "..", "scraped_data", "products.json")
    if not os.path.exists(json_path):
        print(f"Products JSON not found at {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        products = json.load(f)

    print(f"Loaded {len(products)} products. Seeding Firestore 'products' collection...")
    
    batch = db.batch()
    count = 0
    
    products_ref = db.collection('products')
    
    for p in products:
        # Fix image paths to refer to the frontend's public root `/images/...`
        # old format: "images/uuid/1.jpg"
        # new format: "/images/uuid/1.jpg"
        
        if p.get("image_url"):
            # Ensure it starts with /
            if not p["image_url"].startswith("/"):
                p["image_url"] = "/" + p["image_url"]
        
        updated_all_images = []
        for img in p.get("all_images", []):
            if not img.startswith("/"):
                img = "/" + img
            updated_all_images.append(img)
            
        p["all_images"] = updated_all_images
        
        # Try to use the same UUID that the image folder uses for the document ID
        doc_id = None
        if p.get("image_url"):
            parts = p["image_url"].split("/")
            # format is "/images/UUID/1.jpg"
            if len(parts) >= 4 and parts[1] == "images":
                doc_id = parts[2]
                
        if doc_id:
            doc_ref = products_ref.document(doc_id)
        else:
            doc_ref = products_ref.document()
            
        # Optional: You can add created_at timestamps if your schema requires it
        p["id"] = doc_id if doc_id else doc_ref.id
            
        batch.set(doc_ref, p)
        count += 1
        
        # Firestore batch writes have a limit
        if count % 100 == 0:
            batch.commit()
            print(f"Committed {count} products...")
            batch = db.batch()
            
    if count % 100 != 0:
        batch.commit()
        
    print(f"Successfully seeded {count} products to Firestore!")

if __name__ == "__main__":
    seed_products()
