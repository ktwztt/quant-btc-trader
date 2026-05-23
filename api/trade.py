import json
import os
import math
import time
from http.server import BaseHTTPRequestHandler

GAMMA_API = "https://gamma-api.polymarket.com"
CLOB_HOST = "https://clob.polymarket.com"
TIMEFRAME = 5 * 60  # 5 minutes in seconds

# Use py_clob_client_v2 (same as reference project)
try:
    from py_clob_client_v2.client import ClobClient
    from py_clob_client_v2.clob_types import (
        OrderArgs, OrderType, ApiCreds, PartialCreateOrderOptions, OrderPayload
    )
    from py_clob_client_v2.order_builder.constants import BUY, SELL
except ImportError:
    # Fallback to py_clob_client if v2 not available
    from py_clob_client.client import ClobClient
    from py_clob_client.clob_types import OrderArgs, ApiCreds, PartialCreateOrderOptions, OrderPayload
    from py_clob_client.order_builder.constants import BUY, SELL
    OrderType = None


def get_config(headers=None):
    if headers:
        raw = headers.get("X-Poly-Creds") or headers.get("x-poly-creds")
        if raw:
            try:
                creds = json.loads(raw)
                if creds.get("privateKey") and creds.get("apiKey"):
                    return {
                        "private_key": creds["privateKey"].strip(),
                        "api_key": creds["apiKey"].strip(),
                        "api_secret": creds["apiSecret"].strip(),
                        "api_passphrase": creds["apiPassphrase"].strip(),
                        "funder_address": creds.get("funderAddress", "").strip(),
                        "signature_type": int(creds.get("signatureType", 0)),
                        "proxy_url": creds.get("proxyUrl", "").strip(),
                    }
            except (json.JSONDecodeError, KeyError):
                pass

    return {
        "private_key": os.environ.get("POLY_PRIVATE_KEY", "").strip(),
        "api_key": os.environ.get("POLY_API_KEY", "").strip(),
        "api_secret": os.environ.get("POLY_API_SECRET", "").strip(),
        "api_passphrase": os.environ.get("POLY_API_PASSPHRASE", "").strip(),
        "funder_address": os.environ.get("POLY_FUNDER_ADDRESS", "").strip(),
        "signature_type": int(os.environ.get("POLY_SIGNATURE_TYPE", "0")),
        "proxy_url": os.environ.get("POLY_PROXY_URL", "").strip(),
    }


def make_client(cfg):
    pk = cfg["private_key"].strip()
    if pk.startswith("0x") or pk.startswith("0X"):
        pk = pk[2:]

    sig_type = cfg["signature_type"]

    # Match reference code's _ensure_client logic
    if sig_type == 0:
        client = ClobClient(CLOB_HOST, key=pk, chain_id=137, use_server_time=False)
    elif sig_type in (1, 2, 3):
        client = ClobClient(
            CLOB_HOST, key=pk, chain_id=137,
            signature_type=sig_type, funder=cfg["funder_address"]
        )
    else:
        raise ValueError(f"Invalid signature_type={sig_type}")

    # Set API credentials
    if cfg["api_key"] and cfg["api_secret"] and cfg["api_passphrase"]:
        creds = ApiCreds(
            api_key=cfg["api_key"],
            api_secret=cfg["api_secret"],
            api_passphrase=cfg["api_passphrase"],
        )
        client.set_api_creds(creds)
    else:
        # Derive credentials automatically
        creds = client.create_or_derive_api_key()
        client.set_api_creds(creds)

    return client


def _proxies():
    """Get proxy config from environment."""
    p = os.environ.get("POLY_PROXY_URL", "").strip()
    if p:
        return {"http": p, "https": p}
    return None


def find_market():
    import requests

    now = int(time.time())
    current_slot = (now // TIMEFRAME) * TIMEFRAME
    slots = [current_slot, current_slot - TIMEFRAME, current_slot + TIMEFRAME]

    for slot in slots:
        slug = f"btc-updown-5m-{slot}"
        try:
            res = requests.get(f"{GAMMA_API}/events?slug={slug}", timeout=10, proxies=_proxies())
            if not res.ok:
                continue
            events = res.json()
            if not events:
                continue

            event = events[0]
            if not event.get("active") or event.get("closed"):
                continue

            for market in event.get("markets", []):
                if not market.get("active") or market.get("closed"):
                    continue

                clob_ids = market.get("clobTokenIds", [])
                outcomes = market.get("outcomes", [])
                if isinstance(clob_ids, str):
                    clob_ids = json.loads(clob_ids)
                if isinstance(outcomes, str):
                    outcomes = json.loads(outcomes)
                if len(clob_ids) < 2:
                    continue

                up_idx = outcomes.index("Up") if "Up" in outcomes else 0
                down_idx = outcomes.index("Down") if "Down" in outcomes else 1

                return {
                    "slug": slug,
                    "question": market.get("question", slug),
                    "condition_id": market.get("conditionId"),
                    "up_token_id": clob_ids[up_idx],
                    "down_token_id": clob_ids[down_idx],
                    "end_time": (slot + TIMEFRAME) * 1000,
                    "neg_risk": market.get("negRisk", False),
                    "slot": slot,
                    "outcomes": outcomes,
                }
        except Exception:
            continue
    return None


def place_order(client, token_id, side, size, price):
    """Place a limit buy/sell order using requests (not httpx) for Vercel compatibility."""
    import requests as req
    from py_clob_client_v2.endpoints import POST_ORDER
    from py_clob_client_v2.clob_types import RequestArgs
    from py_clob_client_v2.headers.headers import create_level_2_headers
    from py_clob_client_v2.order_utils.model.order_data_v2 import order_to_json_v2
    from py_clob_client_v2.order_utils.model.order_data_v1 import order_to_json_v1

    normalized_price = max(0.001, min(round(price, 2), 0.999))
    contracts = max(int(size), 5)
    min_contracts = math.ceil(1.0 / max(normalized_price, 0.01))
    if contracts < min_contracts:
        contracts = min_contracts

    side_const = BUY if side == "buy" else SELL

    order_args = OrderArgs(
        price=normalized_price,
        size=contracts,
        side=side_const,
        token_id=token_id,
    )

    # Step 1: Create and sign the order (pass tick_size/neg_risk to avoid internal API calls)
    signed_order = client.create_order(
        order_args,
        options=PartialCreateOrderOptions(tick_size="0.01", neg_risk=False),
    )

    # Step 2: Build the payload (same logic as client.post_order)
    owner = client.creds.api_key or ""
    order_type = OrderType.GTC if OrderType else "GTC"

    if hasattr(signed_order, "timestamp"):  # v2 order check
        order_payload = order_to_json_v2(signed_order, owner, order_type, False, False)
    else:
        order_payload = order_to_json_v1(signed_order, owner, order_type, False, False)

    serialized = json.dumps(order_payload, separators=(",", ":"), ensure_ascii=False)

    # Step 3: Create signed headers
    request_args = RequestArgs(
        method="POST",
        request_path=POST_ORDER,
        body=order_payload,
        serialized_body=serialized,
    )
    headers = {k: v.strip() if isinstance(v, str) else v
               for k, v in create_level_2_headers(client.signer, client.creds, request_args).items()}

    # Step 4: POST using requests
    resp = req.post(
        f"{CLOB_HOST}{POST_ORDER}",
        headers=headers,
        data=serialized,
        timeout=30,
        proxies=_proxies(),
    )

    if resp.status_code != 200:
        raise Exception(f"CLOB API error {resp.status_code}: {resp.text[:300]}")

    return resp.json()


def get_order_status(client, order_id):
    """Get order status using requests instead of httpx."""
    import requests as req
    from py_clob_client_v2.endpoints import GET_ORDER
    from py_clob_client_v2.headers.headers import create_level_1_headers

    try:
        request_path = f"{GET_ORDER}{order_id}"
        headers = create_level_1_headers(client.signer)

        resp = req.get(
            f"{CLOB_HOST}{request_path}",
            headers=headers,
            timeout=15,
            proxies=_proxies(),
        )

        if resp.status_code != 200:
            return {"status": "error", "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}

        status = resp.json()
        if not status:
            return {"status": "unknown"}

        remaining = float(status.get("remainingSize", status.get("size", 0)))
        s = status.get("status", "").upper()

        if remaining <= 0 or s in ("FILLED", "MATCHED"):
            return {"status": "filled", "order": status}
        if s in ("CANCELLED", "CANCELED"):
            return {"status": "cancelled", "order": status}
        return {"status": "open", "order": status}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def cancel_order(client, order_id):
    """Cancel order using requests instead of httpx."""
    import requests as req
    from py_clob_client_v2.endpoints import CANCEL
    from py_clob_client_v2.clob_types import RequestArgs
    from py_clob_client_v2.headers.headers import create_level_2_headers

    try:
        body = {"orderID": order_id}
        serialized = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
        request_args = RequestArgs(
            method="DELETE",
            request_path=CANCEL,
            body=body,
            serialized_body=serialized,
        )
        headers = create_level_2_headers(client.signer, client.creds, request_args)

        resp = req.delete(
            f"{CLOB_HOST}{CANCEL}",
            headers=headers,
            data=serialized,
            timeout=15,
            proxies=_proxies(),
        )

        if resp.status_code == 200:
            return {"success": True, "result": resp.json()}

        err = resp.text.lower()
        if "filled" in err or "matched" in err:
            return {"success": False, "error": "Order already filled"}
        return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        from urllib.parse import urlparse, parse_qs

        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        action = params.get("action", ["status"])[0]

        cfg = get_config(self.headers)
        if not cfg["private_key"]:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Polymarket credentials not configured"}).encode())
            return

        try:
            client = make_client(cfg)

            if action == "market":
                market = find_market()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"market": market}).encode())

            elif action == "status":
                order_id = params.get("orderId", [None])[0]
                if not order_id:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "orderId required"}).encode())
                    return
                result = get_order_status(client, order_id)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())

            else:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Unknown action: {action}"}).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
            return

        cfg = get_config(self.headers)
        if not cfg["private_key"]:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Polymarket credentials not configured"}).encode())
            return

        action = data.get("action", "trade")

        try:
            client = make_client(cfg)

            if action == "trade":
                side = data.get("side", "buy")
                outcome = data.get("outcome", "up")
                size = int(data.get("size", 5))
                price = float(data.get("price", 0.5))

                market = find_market()
                if not market:
                    self.send_response(404)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "No active 5m market found"}).encode())
                    return

                token_id = market["up_token_id"] if outcome == "up" else market["down_token_id"]

                last_error = None
                for attempt in range(3):
                    try:
                        result = place_order(client, token_id, side, size, price)
                        # Check for API error in response
                        if isinstance(result, dict) and result.get("errorMsg"):
                            raise Exception(result.get("errorMsg", "API error"))
                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "success": True,
                            "result": result,
                            "market": market["slug"],
                            "outcome": outcome,
                            "side": side,
                            "size": size,
                            "price": price,
                        }).encode())
                        return
                    except Exception as e:
                        last_error = str(e)
                        if "401" in last_error or "Unauthorized" in last_error:
                            client = make_client(cfg)
                            continue
                        if "Invalid order" in last_error:
                            break  # Don't retry
                        time.sleep(2 * (attempt + 1))

                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Order failed: {last_error}"}).encode())

            elif action == "cancel":
                order_id = data.get("orderId")
                if not order_id:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "orderId required"}).encode())
                    return

                result = cancel_order(client, order_id)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())

            else:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Unknown action: {action}"}).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
