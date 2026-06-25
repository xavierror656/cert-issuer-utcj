from __future__ import annotations

import base64
import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from cert_core import Chain, chain_to_bitcoin_network
from eth_keys import keys
import bitcoin


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _derive_ethereum_material(private_key_hex: str) -> dict[str, Any]:
    normalized = private_key_hex.lower().removeprefix("0x")
    private_key = keys.PrivateKey(bytes.fromhex(normalized))
    public_key = private_key.public_key
    public_bytes = public_key.to_bytes()
    x = public_bytes[:32]
    y = public_bytes[32:]
    address = public_key.to_checksum_address()
    return {
        "address": address,
        "public_key_hex": public_key.to_hex(),
        "jwk": {
            "kty": "EC",
            "crv": "secp256k1",
            "x": _b64url(x),
            "y": _b64url(y),
        },
    }


@lru_cache(maxsize=16)
def get_issuer_crypto(
    private_key_file: Path | None,
    private_key_format: str,
    issuing_address: str | None,
    verification_method: str | None,
    issuer_assertion_jwk_json: str | None,
    issuer_profile_url: str
) -> dict[str, Any]:
    private_key = None
    if private_key_file and private_key_file.exists():
        private_key = private_key_file.read_text(encoding="utf-8").strip()

    explicit_jwk = None
    if issuer_assertion_jwk_json:
        explicit_jwk = json.loads(issuer_assertion_jwk_json)

    if private_key_format == "ethereum_hex" and private_key:
        material = _derive_ethereum_material(private_key)
        address = issuing_address or material["address"]
        vm = verification_method or f"{issuer_profile_url}#key-1"
        return {
            "address": address,
            "verification_method": vm,
            "public_key": f"ecdsa-koblitz-pubkey:{address}",
            "verification_method_entry": {
                "id": vm,
                "type": "EcdsaSecp256k1VerificationKey2019",
                "controller": issuer_profile_url,
                "publicKeyJwk": material["jwk"],
            },
        }

    address = issuing_address or "mockchain:utcj"
    vm = verification_method or f"{issuer_profile_url}#key-1"
    verification_method_entry = None
    if explicit_jwk:
        verification_method_entry = {
            "id": vm,
            "type": "EcdsaSecp256k1VerificationKey2019",
            "controller": issuer_profile_url,
            "publicKeyJwk": explicit_jwk,
        }
    return {
        "address": address,
        "verification_method": vm,
        "public_key": f"ecdsa-koblitz-pubkey:{address}",
        "verification_method_entry": verification_method_entry,
    }


@dataclass(slots=True)
class Settings:
    app_name: str
    app_env: str
    host: str
    port: int
    public_base_url: str
    default_chain: str
    safe_mode: bool
    max_retry: int
    etherscan_api_token: str | None
    ethereum_rpc_url: str | None
    goerli_rpc_url: str | None
    sepolia_rpc_url: str | None
    polygon_rpc_url: str | None
    arbitrum_rpc_url: str | None
    blockcypher_api_token: str | None
    bitcoind: bool
    nonce: int
    gas_price: int
    gas_limit: int
    max_priority_fee_per_gas: int
    gas_price_dynamic: bool
    tx_fee: float
    dust_threshold: float
    satoshi_per_byte: int
    batch_size: int
    data_dir: Path
    public_dir: Path
    issued_dir: Path
    branding_dir: Path
    certificates_dir: Path
    logos_dir: Path
    issuer_name: str
    issuer_slug: str
    issuer_email: str
    issuer_website: str
    issuer_description: str
    issuer_intro_url: str
    issuer_logo_path: Path
    issuer_private_key_file: Path | None
    issuer_private_key_format: str
    issuing_address: str | None
    verification_method: str | None
    issuer_assertion_jwk_json: str | None
    did_web_enabled: bool
    did_web_base: str | None
    admin_api_key: str | None
    issuer_api_key: str | None
    auditor_api_key: str | None

    @classmethod
    def load(cls) -> "Settings":
        project_root = Path(__file__).resolve().parents[2]
        data_dir = Path(os.getenv("DATA_DIR", project_root / "data" / "utcj_microcredentials"))
        public_dir = data_dir / "public"
        issued_dir = data_dir / "issued"
        branding_dir = project_root / "assets" / "branding"
        certificates_dir = project_root / "assets" / "certificates"
        logos_dir = project_root / "assets" / "logos"
        issuer_logo_default = logos_dir / "utcj-logo.png"
        return cls(
            app_name=os.getenv("APP_NAME", "UTCJ Microcredentials API"),
            app_env=os.getenv("APP_ENV", "development"),
            host=os.getenv("HOST", "0.0.0.0"),
            port=int(os.getenv("PORT", "8000")),
            public_base_url=os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/"),
            default_chain=os.getenv("DEFAULT_CHAIN", "mockchain"),
            safe_mode=_env_bool("SAFE_MODE", False),
            max_retry=int(os.getenv("MAX_RETRY", "3")),
            etherscan_api_token=os.getenv("ETHERSCAN_API_TOKEN"),
            ethereum_rpc_url=os.getenv("ETHEREUM_RPC_URL"),
            goerli_rpc_url=os.getenv("GOERLI_RPC_URL"),
            sepolia_rpc_url=os.getenv("SEPOLIA_RPC_URL"),
            polygon_rpc_url=os.getenv("POLYGON_RPC_URL"),
            arbitrum_rpc_url=os.getenv("ARBITRUM_RPC_URL"),
            blockcypher_api_token=os.getenv("BLOCKCYPHER_API_TOKEN"),
            bitcoind=_env_bool("BITCOIND", False),
            nonce=int(os.getenv("NONCE", "0")),
            gas_price=int(os.getenv("GAS_PRICE", "25000000000")),
            gas_limit=int(os.getenv("GAS_LIMIT", "25000")),
            max_priority_fee_per_gas=int(os.getenv("MAX_PRIORITY_FEE_PER_GAS", "0")),
            gas_price_dynamic=_env_bool("GAS_PRICE_DYNAMIC", False),
            tx_fee=float(os.getenv("TX_FEE", "0.0006")),
            dust_threshold=float(os.getenv("DUST_THRESHOLD", "0.0000275")),
            satoshi_per_byte=int(os.getenv("SATOSHI_PER_BYTE", "250")),
            batch_size=int(os.getenv("BATCH_SIZE", "1")),
            data_dir=data_dir,
            public_dir=public_dir,
            issued_dir=issued_dir,
            branding_dir=branding_dir,
            certificates_dir=certificates_dir,
            logos_dir=logos_dir,
            issuer_name=os.getenv("ISSUER_NAME", "Universidad Tecnologica de Ciudad Juarez"),
            issuer_slug=os.getenv("ISSUER_SLUG", "utcj"),
            issuer_email=os.getenv("ISSUER_EMAIL", "microcredenciales@utcj.edu.mx"),
            issuer_website=os.getenv("ISSUER_WEBSITE", "https://www.utcj.edu.mx"),
            issuer_description=os.getenv(
                "ISSUER_DESCRIPTION",
                "Plataforma institucional de microcredenciales verificables de la Universidad Tecnologica de Ciudad Juarez.",
            ),
            issuer_intro_url=os.getenv("ISSUER_INTRO_URL", "https://www.utcj.edu.mx/nosotros/"),
            issuer_logo_path=Path(os.getenv("ISSUER_LOGO_PATH", issuer_logo_default)),
            issuer_private_key_file=Path(os.getenv("ISSUER_PRIVATE_KEY_FILE")) if os.getenv("ISSUER_PRIVATE_KEY_FILE") else None,
            issuer_private_key_format=os.getenv("ISSUER_PRIVATE_KEY_FORMAT", "ethereum_hex"),
            issuing_address=os.getenv("ISSUING_ADDRESS"),
            verification_method=os.getenv("VERIFICATION_METHOD"),
            issuer_assertion_jwk_json=os.getenv("ISSUER_ASSERTION_JWK_JSON"),
            did_web_enabled=_env_bool("DID_WEB_ENABLED", False),
            did_web_base=os.getenv("DID_WEB_BASE"),
            admin_api_key=os.getenv("ADMIN_API_KEY"),
            issuer_api_key=os.getenv("ISSUER_API_KEY"),
            auditor_api_key=os.getenv("AUDITOR_API_KEY"),
        )

    def ensure_directories(self) -> None:
        for path in [
            self.data_dir,
            self.public_dir,
            self.issued_dir,
            self.public_dir / "certificates",
            self.public_dir / "issuer",
            self.branding_dir,
            self.certificates_dir,
            self.logos_dir,
        ]:
            path.mkdir(parents=True, exist_ok=True)

    @property
    def issuer_profile_url(self) -> str:
        return f"{self.public_base_url}/issuer-profile"

    @property
    def revocation_list_url(self) -> str:
        return f"{self.public_base_url}/revocation-list"

    @property
    def public_keys_url(self) -> str:
        return f"{self.public_base_url}/public-keys"

    def certificate_url(self, certificate_id: str) -> str:
        return f"{self.public_base_url}/certificate/{certificate_id}"

    def certificate_visual_url(self, certificate_id: str) -> str:
        return f"{self.public_base_url}/certificate/{certificate_id}/visual.svg"

    def certificate_pdf_url(self, certificate_id: str) -> str:
        return f"{self.public_base_url}/certificate/{certificate_id}/pdf"

    def _read_private_key(self) -> str | None:
        if not self.issuer_private_key_file:
            return None
        if not self.issuer_private_key_file.exists():
            return None
        return self.issuer_private_key_file.read_text(encoding="utf-8").strip()

    def issuer_crypto(self) -> dict[str, Any]:
        return get_issuer_crypto(
            self.issuer_private_key_file,
            self.issuer_private_key_format,
            self.issuing_address,
            self.verification_method,
            self.issuer_assertion_jwk_json,
            self.issuer_profile_url,
        )

    def issuer_profile(self) -> dict[str, Any]:
        crypto = self.issuer_crypto()
        profile: dict[str, Any] = {
            "@context": [
                "https://www.w3.org/ns/cid/v1",
                "https://www.w3.org/ns/credentials/v2",
                "https://w3id.org/blockcerts/v3.2",
                "https://w3id.org/security/suites/secp256k1-2019/v1",
            ],
            "type": ["BlockcertsIssuerProfile"],
            "id": self.issuer_profile_url,
            "name": self.issuer_name,
            "url": self.issuer_website,
            "description": self.issuer_description,
            "introductionURL": self.issuer_intro_url,
            "revocationList": self.revocation_list_url,
            "email": self.issuer_email,
            "publicKey": [
                {
                    "id": crypto["public_key"],
                    "created": "2026-01-01T00:00:00Z",
                }
            ],
            "image": self.certificate_visual_url("branding-preview"),
        }
        if self.issuer_logo_path.exists():
            profile["image"] = f"{self.public_base_url}/assets/logos/{self.issuer_logo_path.name}"
        if crypto["verification_method_entry"]:
            profile["verificationMethod"] = [crypto["verification_method_entry"]]
            profile["assertionMethod"] = [crypto["verification_method_entry"]["id"]]
        return profile

    def revocation_list(self) -> dict[str, Any]:
        return {
            "@context": "https://w3id.org/openbadges/v2",
            "id": self.revocation_list_url,
            "type": "RevocationList",
            "issuer": self.issuer_profile_url,
            "revokedAssertions": [],
        }

    def build_cert_issuer_config(self, chain_name: str) -> Any:
        # Resolve dynamic/L2 network mapping
        actual_chain_name = chain_name
        rpc_override = None
        
        if chain_name == "polygon_mainnet":
            actual_chain_name = "ethereum_mainnet"
            rpc_override = self.polygon_rpc_url
        elif chain_name in ("polygon_amoy", "polygon_testnet"):
            actual_chain_name = "ethereum_sepolia"
            rpc_override = self.polygon_rpc_url
        elif chain_name == "arbitrum_mainnet":
            actual_chain_name = "ethereum_mainnet"
            rpc_override = self.arbitrum_rpc_url
        elif chain_name in ("arbitrum_sepolia", "arbitrum_testnet"):
            actual_chain_name = "ethereum_sepolia"
            rpc_override = self.arbitrum_rpc_url

        chain = Chain.parse_from_chain(actual_chain_name)
        if chain.is_bitcoin_type():
            bitcoin.SelectParams(chain_to_bitcoin_network(chain))
        crypto = self.issuer_crypto()
        usb_name = str(self.issuer_private_key_file.parent) if self.issuer_private_key_file else str(self.data_dir)
        key_file = self.issuer_private_key_file.name if self.issuer_private_key_file else "unused.key"

        class ConfigObject:
            pass

        config = ConfigObject()
        config.chain = chain
        config.issuing_address = crypto["address"]
        config.verification_method = crypto["verification_method"]
        config.usb_name = usb_name
        config.key_file = key_file
        config.safe_mode = self.safe_mode
        config.max_retry = self.max_retry
        config.nonce = self.nonce
        config.max_priority_fee_per_gas = self.max_priority_fee_per_gas
        config.gas_price = self.gas_price
        config.gas_price_dynamic = self.gas_price_dynamic
        config.gas_limit = self.gas_limit
        config.etherscan_api_token = self.etherscan_api_token
        config.ethereum_rpc_url = rpc_override or self.ethereum_rpc_url
        config.goerli_rpc_url = self.goerli_rpc_url
        config.sepolia_rpc_url = rpc_override or self.sepolia_rpc_url
        config.blockcypher_api_token = self.blockcypher_api_token
        config.bitcoind = self.bitcoind
        config.dust_threshold = self.dust_threshold
        config.tx_fee = self.tx_fee
        config.batch_size = self.batch_size
        config.satoshi_per_byte = self.satoshi_per_byte
        config.multiple_proofs = "chained"
        config.issuance_timezone = "UTC"
        config.context_urls = None
        config.context_file_paths = None
        return config
