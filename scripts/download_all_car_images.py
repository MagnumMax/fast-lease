import argparse
from pathlib import Path

from download_car_image import fetch_wikipedia_image


# Map car IDs to the Wikipedia query string that is most likely to return the right image.
CAR_QUERIES: dict[str, str] = {
    "rolls-royce-cullinan": "Rolls-Royce Cullinan",
    "lamborghini-huracan": "Lamborghini Huracan",
    "ferrari-488-spider": "Ferrari 488 Spider",
    "bentley-bentayga": "Bentley Bentayga",
    "rivian-r1t-adventure": "Rivian R1T",
    "volvo-xc40-recharge": "Volvo XC40 Recharge",
}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download images for all cars defined in CAR_QUERIES into the public assets folder."
    )
    parser.add_argument(
        "--output-dir",
        default="public/assets",
        help="Directory where the downloaded images will be saved.",
    )
    parser.add_argument(
        "--insecure-ssl",
        action="store_true",
        help="Skip TLS certificate verification (useful if the environment lacks CA bundle).",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for car_id, query in CAR_QUERIES.items():
        output_path = output_dir / f"{car_id}.jpg"
        try:
            image_url, content = fetch_wikipedia_image(query, insecure_ssl=args.insecure_ssl)
        except Exception as exc:
            print(f"[ERROR] {car_id}: failed to download image ({exc})")
            continue

        output_path.write_bytes(content)
        print(f"[OK] {car_id}: saved image from {image_url} -> {output_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
