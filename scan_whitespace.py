#!/usr/bin/env python3
"""
Scan toh_image_index.json for leading/trailing whitespace in string values.
Includes diagnostic output to verify scan is working.
"""

import json
import csv
from pathlib import Path

def scan_for_whitespace(json_file, output_csv, verbose=True):
    """
    Scan JSON file for values with leading/trailing whitespace.
    
    Args:
        json_file: Path to JSON file
        output_csv: Path to output CSV file
        verbose: Print diagnostic info
    """
    
    # Load JSON
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Collect findings
    findings = []
    total_strings_scanned = 0
    
    # Scan metadata
    if 'metadata' in data and isinstance(data['metadata'], dict):
        for key, value in data['metadata'].items():
            if isinstance(value, str):
                total_strings_scanned += 1
                has_leading = value != value.lstrip()
                has_trailing = value != value.rstrip()
                if has_leading or has_trailing:
                    findings.append({
                        'location': 'metadata',
                        'field': key,
                        'value': repr(value),  # repr to show spaces
                        'has_leading_space': has_leading,
                        'has_trailing_space': has_trailing,
                        'index': None
                    })
            elif isinstance(value, dict):
                for subkey, subvalue in value.items():
                    if isinstance(subvalue, (str, int)):
                        if isinstance(subvalue, str):
                            total_strings_scanned += 1
                            has_leading = subvalue != subvalue.lstrip()
                            has_trailing = subvalue != subvalue.rstrip()
                            if has_leading or has_trailing:
                                findings.append({
                                    'location': f'metadata.{key}',
                                    'field': subkey,
                                    'value': repr(subvalue),
                                    'has_leading_space': has_leading,
                                    'has_trailing_space': has_trailing,
                                    'index': None
                                })
    
    # Scan images
    if 'images' in data and isinstance(data['images'], list):
        total_images = len(data['images'])
        for idx, image in enumerate(data['images']):
            if isinstance(image, dict):
                for key, value in image.items():
                    if isinstance(value, str):
                        total_strings_scanned += 1
                        has_leading = value != value.lstrip()
                        has_trailing = value != value.rstrip()
                        if has_leading or has_trailing:
                            findings.append({
                                'location': 'images',
                                'field': key,
                                'value': repr(value),
                                'has_leading_space': has_leading,
                                'has_trailing_space': has_trailing,
                                'index': idx
                            })
    
    # Write CSV
    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'location', 'index', 'field', 'value', 'has_leading_space', 'has_trailing_space'
        ])
        writer.writeheader()
        writer.writerows(findings)
    
    # Print summary
    if verbose:
        print(f"\n{'='*60}")
        print(f"Whitespace Scan Report")
        print(f"{'='*60}")
        print(f"JSON file scanned: {json_file}")
        print(f"Total string values scanned: {total_strings_scanned:,}")
        if 'images' in data and isinstance(data['images'], list):
            print(f"Total image records: {len(data['images']):,}")
        print(f"Issues found: {len(findings)}")
        print(f"Output file: {output_csv}")
        print(f"{'='*60}\n")
        
        if findings:
            print(f"Issues detected ({len(findings)} total):\n")
            for i, finding in enumerate(findings[:20], 1):  # Show first 20
                print(f"{i}. {finding['location']} / {finding['field']} (index: {finding['index']})")
                print(f"   Value: {finding['value']}")
                print(f"   Leading: {finding['has_leading_space']}, Trailing: {finding['has_trailing_space']}\n")
            if len(findings) > 20:
                print(f"... and {len(findings) - 20} more (see CSV for full list)\n")
        else:
            print("✓ No issues found - JSON is clean!")


if __name__ == '__main__':
    json_file = Path('data/toh_image_index.json')
    output_csv = Path('whitespace_scan_results.csv')
    
    if not json_file.exists():
        print(f"✗ Error: {json_file} not found")
        exit(1)
    
    scan_for_whitespace(json_file, output_csv, verbose=True)
