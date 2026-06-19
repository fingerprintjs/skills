# Load .env before reading any keys (call this before the client is constructed).
import os
from dotenv import load_dotenv

load_dotenv()

# Create one client at startup. Region MUST match your workspace or lookups fail — map it
# from FINGERPRINT_REGION ('us' | 'eu' | 'ap'), don't hardcode.
import fingerprint_server_sdk
from fingerprint_server_sdk.configuration import Region

REGIONS = {"us": Region.US, "eu": Region.EU, "ap": Region.AP}

configuration = fingerprint_server_sdk.Configuration(
    api_key=os.environ["FINGERPRINT_SECRET_API_KEY"],
    region=REGIONS.get(os.environ.get("FINGERPRINT_REGION", "us"), Region.US),
)

client = fingerprint_server_sdk.FingerprintApi(configuration)
