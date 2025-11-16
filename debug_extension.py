#!/usr/bin/env python3
"""
Extension Debugging Helper
This script helps troubleshoot why the extension isn't working
"""

import webbrowser
import os
import sys

def main():
    print(" Extension Debugging Helper")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists("extension/build/chrome-mv3-dev/manifest.json"):
        print(" Error: Not in the right directory!")
        print("   Please run this from the project root directory")
        print("   Expected: extension/build/chrome-mv3-dev/manifest.json")
        return
    
    print(" Found extension build directory")
    
    # Check manifest
    try:
        import json
        with open("extension/build/chrome-mv3-dev/manifest.json", "r") as f:
            manifest = json.load(f)
        
        print(f" Manifest loaded: {manifest['name']}")
        print(f"   Version: {manifest['version']}")
        print(f"   Content scripts: {len(manifest.get('content_scripts', []))}")
        
        # Check content script matches
        content_scripts = manifest.get('content_scripts', [])
        if content_scripts:
            matches = content_scripts[0].get('matches', [])
            print(f"   Matches: {matches}")
            
            # Check if localhost is included
            localhost_matches = [m for m in matches if 'localhost' in m or '127.0.0.1' in m]
            if localhost_matches:
                print(f" Localhost matches found: {localhost_matches}")
            else:
                print(" No localhost matches found!")
        
    except Exception as e:
        print(f" Error reading manifest: {e}")
        return
    
    # Check if content script file exists
    content_script_path = "extension/build/chrome-mv3-dev/content.ffb82774.js"
    if os.path.exists(content_script_path):
        file_size = os.path.getsize(content_script_path)
        print(f" Content script exists: {file_size:,} bytes")
    else:
        print(" Content script file not found!")
        return
    
    # Check test page
    test_page_path = "extension/test-page.html"
    if os.path.exists(test_page_path):
        print(f" Test page exists: {test_page_path}")
    else:
        print(" Test page not found!")
        return
    
    print("\n" + "=" * 50)
    print(" NEXT STEPS:")
    print("1. Open Chrome and go to chrome://extensions/")
    print("2. Enable 'Developer mode' (toggle in top right)")
    print("3. Click 'Load unpacked'")
    print("4. Select the folder: extension/build/chrome-mv3-dev")
    print("5. Make sure the extension is enabled")
    print("6. Open the test page:")
    print(f"   file://{os.path.abspath(test_page_path)}")
    print("7. Open Developer Tools (F12) and check Console tab")
    print("8. Try uploading a file and watch for logs")
    
    print("\n WHAT TO LOOK FOR:")
    print(" Extension logs should start with:")
    print("    ContentScript: Starting initialization...")
    print("    FileGuard constructor called")
    print("    FileUploadMonitor constructor called")
    
    print("\n If you see nothing:")
    print("   - Check if extension is enabled in chrome://extensions/")
    print("   - Check if you're on a matching domain (localhost/127.0.0.1)")
    print("   - Check Console for any errors")
    print("   - Try refreshing the page")
    
    # Ask if user wants to open test page
    try:
        response = input("\n Open test page in browser? (y/n): ").lower().strip()
        if response in ['y', 'yes']:
            test_page_url = f"file://{os.path.abspath(test_page_path)}"
            print(f"Opening: {test_page_url}")
            webbrowser.open(test_page_url)
    except KeyboardInterrupt:
        print("\n Goodbye!")

if __name__ == "__main__":
    main()
