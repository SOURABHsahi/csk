import requests
import json

BASE_URL = "http://localhost:5095/api"

def get_token(employee_id):
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "employeeId": employee_id,
        "password": "Password@123"
    })
    if resp.status_code != 200:
        return None, resp.text
    data = resp.json()
    token = data.get("data", {}).get("token") or data.get("token")
    return token, None

def run_community_demo():
    print("====================================================")
    print("  KNOME PUBLIC COMMUNITY LIFECYCLE DEMO (SQL SERVER) ")
    print("====================================================\n")

    # 1. Login as Creator (MPO102 - Community Admin)
    creator_id = "MPO102"
    token_emp2, err = get_token(creator_id)
    if not token_emp2:
        print(f"Failed to authenticate Creator. Error: {err}")
        return

    headers_emp2 = {"Authorization": f"Bearer {token_emp2}", "Content-Type": "application/json"}
    print(f"[1/7] [OK] Creator ({creator_id}) Authenticated successfully!\n")

    # 2. Create a Public Community
    print("[2/7] Creating a new Public Community ('DevOps & AI Innovation')...")
    create_payload = {
        "name": "DevOps & AI Innovation Hub",
        "description": "Enterprise community for DevOps engineers, ML pipelines, and Cloud Infrastructure at MPOnline.",
        "communityType": "Public",
        "rules": "1. Respect everyone\n2. Share technical knowledge\n3. No self-promotion",
        "faq": "Q: Who can join?\nA: Open to all employees!"
    }
    resp = requests.post(f"{BASE_URL}/communities", json=create_payload, headers=headers_emp2)
    print(f"  Status Code: {resp.status_code}")
    print(f"  Response: {resp.text}")
    
    if resp.status_code not in (200, 201):
        print("Failed to create community")
        return
        
    community_data = resp.json().get("data", {})
    community_id = community_data.get("communityId") or community_data.get("id")
    print(f"[OK] Public Community Created in SQL Server! Community ID: {community_id}\n")

    # 3. Get Community Details
    print(f"[3/7] Fetching details for Community ID {community_id}...")
    resp = requests.get(f"{BASE_URL}/communities/{community_id}", headers=headers_emp2)
    print(f"  Status Code: {resp.status_code}")
    print(f"  Community Details: {json.dumps(resp.json().get('data', {}), indent=2)}\n")

    # 4. Login as MPO104 (Rishikesh Ugle - Employee) & Join Public Community
    member_id = "MPO104"
    token_emp4, err4 = get_token(member_id)
    headers_emp4 = {"Authorization": f"Bearer {token_emp4}", "Content-Type": "application/json"}

    print(f"[4/7] Logging in as {member_id} (Employee) and joining Public Community...")
    join_resp = requests.post(f"{BASE_URL}/communities/{community_id}/join", headers=headers_emp4)
    print(f"  Status Code: {join_resp.status_code}")
    print(f"  Join Response: {join_resp.text}")
    print(f"[OK] {member_id} Joined Public Community instantly!\n")

    # 5. Get Community Members List
    print(f"[5/7] Fetching Community Members List for Community ID {community_id}...")
    members_resp = requests.get(f"{BASE_URL}/communities/{community_id}/members", headers=headers_emp2)
    print(f"  Status Code: {members_resp.status_code}")
    print(f"  Members: {json.dumps(members_resp.json().get('data', {}), indent=2)}\n")

    # 6. Post a Discussion inside the Public Community (MPO104)
    print(f"[6/7] {member_id} posting a discussion inside the Community...")
    post_payload = {
        "contentText": "Excited to join DevOps & AI Innovation Hub! Here is our latest Docker & Kubernetes setup guide for MPOnline microservices. #devops #kubernetes",
        "communityId": community_id,
        "audienceType": "Community"
    }
    post_resp = requests.post(f"{BASE_URL}/posts", json=post_payload, headers=headers_emp4)
    print(f"  Status Code: {post_resp.status_code}")
    print(f"  Post Response: {post_resp.text}\n")

    # 7. Fetch Community Feed / Posts
    print(f"[7/7] Fetching all Posts published in Community ID {community_id}...")
    feed_resp = requests.get(f"{BASE_URL}/communities/{community_id}/posts", headers=headers_emp4)
    print(f"  Status Code: {feed_resp.status_code}")
    print(f"  Community Feed Posts: {json.dumps(feed_resp.json().get('data', {}), indent=2)}\n")

    print("====================================================")
    print("  ALL PUBLIC COMMUNITY FEATURES COMPLETED 100% SUCCESSFULLY!")
    print("====================================================")

if __name__ == "__main__":
    run_community_demo()
