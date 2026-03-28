#!/usr/bin/env python3
"""
Scan Tour of Honor API for leading/trailing whitespace in memorial data.
Output results to CSV file.
"""

import json
import csv
import requests
from pathlib import Path

API_URL = "https://www.tourofhonor.com/api/v1/public/memorials"

def scan_api_for_whitespace(output_csv, verbose=True):
    """
    Fetch data from Tour of Honor API and scan for leading/trailing whitespace.

    Args:
        output_csv: Path to output CSV file
        verbose: Print diagnostic info
    """

    try:
        print("Fetching data from Tour of Honor API...")
        response = requests.get(API_URL, timeout=30)
        response.raise_for_status()
        data = response.json()

        print("✓ API data retrieved successfully")
        print(f"Response type: {type(data)}")
        if isinstance(data, dict):
            print(f"Response keys: {list(data.keys())}")
        elif isinstance(data, list):
            print(f"Response is list with {len(data)} items")
            if data and isinstance(data[0], dict):
                print(f"First item keys: {list(data[0].keys())}")

    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    # Collect findings
    findings = []
    total_strings_scanned = 0

    # Scan the API response structure
    # The API returns {'memorials': [...]}
    if isinstance(data, dict) and 'memorials' in data:
        memorials = data['memorials']
        if isinstance(memorials, list):
            total_memorials = len(memorials)
            print(f"Processing {total_memorials:,} memorials from API...")
            
            # Debug: show available fields in first memorial
            if memorials and isinstance(memorials[0], dict):
                print(f"Available fields in memorials: {list(memorials[0].keys())}")

            for idx, memorial in enumerate(memorials):
                if isinstance(memorial, dict):
                    memorial_code = memorial.get('code', f'index_{idx}')
                    for key, value in memorial.items():
                        if isinstance(value, str):
                            total_strings_scanned += 1
                            has_leading = value != value.lstrip()
                            has_trailing = value != value.rstrip()
                            has_nbsp = '\xa0' in value

                            if has_leading or has_trailing or has_nbsp:
                                findings.append({
                                    'location': 'api_memorials',
                                    'memorial_code': memorial_code,
                                    'field': key,
                                    'value': repr(value),  # repr to show spaces
                                    'has_leading_space': has_leading,
                                    'has_trailing_space': has_trailing,
                                    'index': idx
                                })
                        elif isinstance(value, dict):
                            # Handle nested objects (like location, etc.)
                            for subkey, subvalue in value.items():
                                if isinstance(subvalue, str):
                                    total_strings_scanned += 1
                                    has_leading = subvalue != subvalue.lstrip()
                                    has_trailing = subvalue != subvalue.rstrip()
                                    if has_leading or has_trailing:
                                        findings.append({
                                            'location': f'api_memorials.{key}',
                                            'memorial_code': memorial_code,
                                            'field': subkey,
                                            'value': repr(subvalue),
                                            'has_leading_space': has_leading,
                                            'has_trailing_space': has_trailing,
                                            'index': idx,
                                            'has_nbsp': has_nbsp
                                        })

    # Write CSV
    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'location', 'memorial_code', 'index', 'field', 'value',
            'has_leading_space', 'has_trailing_space', 'has_nbsp'
  ])

        
        writer.writeheader()
        writer.writerows(findings)

    # Print summary
    if verbose:
        print(f"\n{'='*60}")
        print(f"API Whitespace Scan Report")
        print(f"{'='*60}")
        print(f"API endpoint: {API_URL}")
        print(f"Total string values scanned: {total_strings_scanned:,}")
        if isinstance(data, dict) and 'memorials' in data and isinstance(data['memorials'], list):
            print(f"Total memorial records: {len(data['memorials']):,}")
        print(f"Issues found: {len(findings)}")
        print(f"Output file: {output_csv}")
        print(f"{'='*60}\n")

        if findings:
            print(f"Issues detected ({len(findings)} total):\n")
            for i, finding in enumerate(findings[:20], 1):  # Show first 20
                print(f"{i}. {finding['location']} / {finding['field']} (memorial: {finding['memorial_code']}, index: {finding['index']})")
                print(f"   Value: {finding['value']}")
                print(f"   Leading: {finding['has_leading_space']}, Trailing: {finding['has_trailing_space']}\n")
            if len(findings) > 20:
                print(f"... and {len(findings) - 20} more (see CSV for full list)\n")
        else:
            print("✓ No issues found - API data is clean!")

if __name__ == '__main__':
    output_csv = Path('api_whitespace_scan_results.csv')

    scan_api_for_whitespace(output_csv, verbose=True)