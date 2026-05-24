"""Vercel serverless proxy — forwards trade requests to the VPS backend."""
import json
import os

import requests

VPS_URL = os.environ.get("VPS_TRADE_URL", "http://156.226.176.170:8080/api/trade")
TIMEOUT = 30


def handler(request):
    """Vercel Python serverless function — proxy to VPS."""
    method = request.method.upper()

    # Forward headers (especially X-Poly-Creds)
    headers = {"Content-Type": "application/json"}
    poly_creds = request.headers.get("x-poly-creds") or request.headers.get("X-Poly-Creds")
    if poly_creds:
        headers["X-Poly-Creds"] = poly_creds

    try:
        if method == "GET":
            qs = request.query_string or ""
            url = f"{VPS_URL}?{qs}" if qs else VPS_URL
            resp = requests.get(url, headers=headers, timeout=TIMEOUT)

        elif method == "POST":
            body = request.body
            if isinstance(body, str):
                body = body.encode()
            resp = requests.post(VPS_URL, headers=headers, data=body, timeout=TIMEOUT)

        elif method == "OPTIONS":
            return {
                "statusCode": 204,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, X-Poly-Creds",
                },
                "body": "",
            }

        else:
            return {
                "statusCode": 405,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Method not allowed"}),
            }

        return {
            "statusCode": resp.status_code,
            "headers": {
                "Content-Type": resp.headers.get("Content-Type", "application/json"),
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, X-Poly-Creds",
            },
            "body": resp.text,
        }

    except requests.exceptions.Timeout:
        return {
            "statusCode": 504,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "VPS timeout"}),
        }

    except Exception as e:
        return {
            "statusCode": 502,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": f"Proxy error: {str(e)}"}),
        }
