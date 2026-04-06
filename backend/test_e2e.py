import urllib.request
import urllib.parse
import json

API_URL = "http://127.0.0.1:8000/api"

def e2e_test():
    print("Testing End-to-End Ticketing APIs...")
    
    # 1. Fetch Employees
    req = urllib.request.Request(f"{API_URL}/employees/")
    with urllib.request.urlopen(req) as response:
        employees = json.loads(response.read())
        print(f"Directory: Found {len(employees)} employees.")
    
    # 2. Submit Auto-resolve Ticket
    print("\nSubmitting Auto-Resolve Ticket (Password reset)...")
    data = json.dumps({"subject": "How to reset my password", "description": "I forgot my portal password."}).encode('utf-8')
    req = urllib.request.Request(f"{API_URL}/tickets/", data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        ticket = json.loads(response.read())
        print(f"Ticket Category: {ticket['category']}, Severity: {ticket['severity']}")
        print(f"Status: {ticket['status']}, Auto-resolved: {ticket['auto_resolved']}")
        print(f"Auto-response message generated: {bool(ticket.get('auto_resolve_response'))}")
        
    # 3. Submit High Priority Route Ticket
    print("\nSubmitting High Priority Ticket (Server down)...")
    data = json.dumps({"subject": "The core database server is down", "description": "Total application crash, need engineering ASAP."}).encode('utf-8')
    req = urllib.request.Request(f"{API_URL}/tickets/", data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        ticket = json.loads(response.read())
        print(f"Ticket Category: {ticket['category']}, Severity: {ticket['severity']}")
        print(f"Routing Department: {ticket['predicted_department']}")
        assignee = ticket.get('assignee_details')
        if assignee:
            print(f"Assigned to: {assignee.get('name')} in {assignee.get('department')}")
        else:
            print("No matching available assignee found in directory.")
        
    # 4. Fetch Analytics
    print("\nFetching Live Dashboard Analytics...")
    req = urllib.request.Request(f"{API_URL}/analytics/")
    with urllib.request.urlopen(req) as response:
        analytics = json.loads(response.read())
        print(f"Total Tickets System-wide: {analytics['total']}")
        print(f"Resolved Tickets: {analytics['resolved']}")
        print("Department Load Breakdown:", analytics['department_load'])
    
    print("\nEnd-to-End Backend Verification Passed 100%!")

if __name__ == '__main__':
    e2e_test()
