"""
MUMEGA Art Sources: Open/Sacred Art APIs

These are APIs that provide access to public domain and open source
artwork that can be used freely for sacred purposes.

Each source is curated for:
- Public domain / open license
- Sacred, spiritual, or mythological themes
- High quality imagery
- Reliable API access
"""

import httpx
import asyncio
from typing import List, Dict, Optional
import json


class ArtSource:
    """Base class for art sources."""

    name: str = "Unknown"
    base_url: str = ""

    async def search(self, query: str, limit: int = 10) -> List[Dict]:
        raise NotImplementedError

    async def get_image(self, object_id: str) -> Dict:
        raise NotImplementedError


class MetMuseumAPI(ArtSource):
    """
    Metropolitan Museum of Art Open Access API
    https://metmuseum.github.io/

    470,000+ artworks, many public domain (CC0)
    Excellent for classical art, sacred objects, world cultures
    """

    name = "Metropolitan Museum of Art"
    base_url = "https://collectionapi.metmuseum.org/public/collection/v1"

    async def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search for artworks matching query."""
        async with httpx.AsyncClient() as client:
            # Search
            response = await client.get(
                f"{self.base_url}/search",
                params={"q": query, "hasImages": True}
            )
            data = response.json()

            if not data.get('objectIDs'):
                return []

            # Get details for top results
            results = []
            for obj_id in data['objectIDs'][:limit]:
                try:
                    obj_response = await client.get(f"{self.base_url}/objects/{obj_id}")
                    obj = obj_response.json()

                    if obj.get('primaryImage'):
                        results.append({
                            'id': obj_id,
                            'source': self.name,
                            'title': obj.get('title', 'Untitled'),
                            'artist': obj.get('artistDisplayName', 'Unknown'),
                            'date': obj.get('objectDate', ''),
                            'culture': obj.get('culture', ''),
                            'medium': obj.get('medium', ''),
                            'image_url': obj.get('primaryImage'),
                            'thumbnail_url': obj.get('primaryImageSmall'),
                            'is_public_domain': obj.get('isPublicDomain', False),
                            'department': obj.get('department', ''),
                            'link': obj.get('objectURL', '')
                        })
                except Exception:
                    continue

            return results

    async def get_sacred_art(self, limit: int = 20) -> List[Dict]:
        """Get sacred/spiritual artwork."""
        queries = [
            "sacred geometry",
            "mandala",
            "religious icon",
            "illuminated manuscript",
            "buddhist art",
            "hindu deity",
            "islamic art geometric",
            "christian icon gold"
        ]

        all_results = []
        for query in queries:
            results = await self.search(query, limit=limit // len(queries))
            all_results.extend(results)

        return all_results


class RijksmuseumAPI(ArtSource):
    """
    Rijksmuseum API (Amsterdam)
    https://data.rijksmuseum.nl/

    Requires API key (free registration)
    Excellent for Dutch masters, religious art
    """

    name = "Rijksmuseum"
    base_url = "https://www.rijksmuseum.nl/api/en/collection"

    def __init__(self, api_key: str = ""):
        self.api_key = api_key or "0fiuZFh4"  # Demo key

    async def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search Rijksmuseum collection."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.base_url,
                params={
                    "key": self.api_key,
                    "q": query,
                    "imgonly": True,
                    "ps": limit,
                    "format": "json"
                }
            )
            data = response.json()

            results = []
            for obj in data.get('artObjects', []):
                if obj.get('webImage'):
                    results.append({
                        'id': obj.get('objectNumber'),
                        'source': self.name,
                        'title': obj.get('title', 'Untitled'),
                        'artist': obj.get('principalOrFirstMaker', 'Unknown'),
                        'image_url': obj['webImage'].get('url'),
                        'thumbnail_url': obj.get('headerImage', {}).get('url'),
                        'is_public_domain': True,  # Rijks is all public domain
                        'link': obj.get('links', {}).get('web', '')
                    })

            return results


class ArtInstituteChicagoAPI(ArtSource):
    """
    Art Institute of Chicago API
    https://api.artic.edu/docs/

    No API key required
    Excellent collection of world art
    """

    name = "Art Institute of Chicago"
    base_url = "https://api.artic.edu/api/v1"

    async def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search AIC collection."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/artworks/search",
                params={
                    "q": query,
                    "limit": limit,
                    "fields": "id,title,artist_title,date_display,image_id,thumbnail,is_public_domain"
                }
            )
            data = response.json()

            iiif_url = data.get('config', {}).get('iiif_url', 'https://www.artic.edu/iiif/2')

            results = []
            for obj in data.get('data', []):
                if obj.get('image_id'):
                    results.append({
                        'id': obj.get('id'),
                        'source': self.name,
                        'title': obj.get('title', 'Untitled'),
                        'artist': obj.get('artist_title', 'Unknown'),
                        'date': obj.get('date_display', ''),
                        'image_url': f"{iiif_url}/{obj['image_id']}/full/843,/0/default.jpg",
                        'thumbnail_url': f"{iiif_url}/{obj['image_id']}/full/200,/0/default.jpg",
                        'is_public_domain': obj.get('is_public_domain', False),
                        'link': f"https://www.artic.edu/artworks/{obj['id']}"
                    })

            return results


class WikimediaCommonsAPI(ArtSource):
    """
    Wikimedia Commons API
    https://commons.wikimedia.org/wiki/Commons:API

    Massive collection of public domain images
    Best for sacred geometry, historical illustrations
    """

    name = "Wikimedia Commons"
    base_url = "https://commons.wikimedia.org/w/api.php"

    async def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search Wikimedia Commons."""
        async with httpx.AsyncClient() as client:
            # Search for files
            response = await client.get(
                self.base_url,
                params={
                    "action": "query",
                    "list": "search",
                    "srsearch": f"{query} filetype:bitmap",
                    "srnamespace": 6,  # File namespace
                    "srlimit": limit,
                    "format": "json"
                }
            )
            data = response.json()

            results = []
            for item in data.get('query', {}).get('search', []):
                title = item.get('title', '')
                if title.startswith('File:'):
                    # Get image info
                    info_response = await client.get(
                        self.base_url,
                        params={
                            "action": "query",
                            "titles": title,
                            "prop": "imageinfo",
                            "iiprop": "url|size|mime",
                            "format": "json"
                        }
                    )
                    info_data = info_response.json()

                    pages = info_data.get('query', {}).get('pages', {})
                    for page_id, page in pages.items():
                        if page_id != '-1' and 'imageinfo' in page:
                            img_info = page['imageinfo'][0]
                            results.append({
                                'id': page_id,
                                'source': self.name,
                                'title': title.replace('File:', ''),
                                'image_url': img_info.get('url'),
                                'thumbnail_url': img_info.get('thumburl', img_info.get('url')),
                                'is_public_domain': True,  # Assuming CC0/PD
                                'width': img_info.get('width'),
                                'height': img_info.get('height'),
                                'link': f"https://commons.wikimedia.org/wiki/{title.replace(' ', '_')}"
                            })

            return results


class HarvardArtMuseumsAPI(ArtSource):
    """
    Harvard Art Museums API
    https://harvardartmuseums.org/collections/api

    Requires API key (free)
    250,000+ objects
    """

    name = "Harvard Art Museums"
    base_url = "https://api.harvardartmuseums.org"

    def __init__(self, api_key: str = ""):
        self.api_key = api_key

    async def search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search Harvard collection."""
        if not self.api_key:
            return []

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/object",
                params={
                    "apikey": self.api_key,
                    "q": query,
                    "hasimage": 1,
                    "size": limit
                }
            )
            data = response.json()

            results = []
            for obj in data.get('records', []):
                if obj.get('primaryimageurl'):
                    results.append({
                        'id': obj.get('id'),
                        'source': self.name,
                        'title': obj.get('title', 'Untitled'),
                        'artist': obj.get('people', [{}])[0].get('name', 'Unknown') if obj.get('people') else 'Unknown',
                        'date': obj.get('dated', ''),
                        'culture': obj.get('culture', ''),
                        'image_url': obj.get('primaryimageurl'),
                        'is_public_domain': obj.get('imagepermissionlevel', 0) == 0,
                        'link': obj.get('url', '')
                    })

            return results


# ============ SACRED THEMES ============

SACRED_THEMES = {
    'μ₁': {  # Phase/Identity
        'queries': ['sun god', 'apollo', 'ra egyptian', 'solar deity', 'golden light'],
        'colors': ['gold', 'yellow', 'amber'],
        'symbols': ['sun', 'circle', 'crown']
    },
    'μ₂': {  # Existence/Structure
        'queries': ['sacred architecture', 'temple', 'mountain sacred', 'stone circle', 'pyramid'],
        'colors': ['green', 'brown', 'gray'],
        'symbols': ['square', 'cube', 'foundation']
    },
    'μ₃': {  # Cognition
        'queries': ['hermes', 'thoth', 'mercury god', 'scribe', 'book illuminated'],
        'colors': ['silver', 'gray', 'quicksilver'],
        'symbols': ['caduceus', 'scroll', 'feather']
    },
    'μ₄': {  # Value/Beauty
        'queries': ['venus goddess', 'aphrodite', 'rose mystical', 'beauty divine', 'garden paradise'],
        'colors': ['pink', 'rose', 'copper'],
        'symbols': ['rose', 'mirror', 'shell']
    },
    'μ₅': {  # Expansion
        'queries': ['jupiter god', 'zeus', 'expansion cosmic', 'galaxy spiral', 'tree of life'],
        'colors': ['purple', 'royal blue', 'indigo'],
        'symbols': ['eagle', 'lightning', 'expansion']
    },
    'μ₆': {  # Action
        'queries': ['mars god', 'ares', 'warrior divine', 'sword sacred', 'fire element'],
        'colors': ['red', 'orange', 'crimson'],
        'symbols': ['sword', 'arrow', 'flame']
    },
    'μ₇': {  # Relation
        'queries': ['moon goddess', 'diana artemis', 'mother divine', 'heart sacred', 'lovers'],
        'colors': ['silver', 'white', 'pearl'],
        'symbols': ['moon', 'chalice', 'heart']
    },
    'μ₈': {  # Field/Witness
        'queries': ['neptune poseidon', 'ocean cosmic', 'void infinite', 'meditation', 'all seeing eye'],
        'colors': ['deep blue', 'indigo', 'black'],
        'symbols': ['eye', 'ocean', 'infinity']
    }
}


class SacredArtFinder:
    """
    Find sacred art across all sources for each Mu.
    """

    def __init__(self):
        self.sources = [
            MetMuseumAPI(),
            ArtInstituteChicagoAPI(),
            WikimediaCommonsAPI(),
            RijksmuseumAPI(),
        ]

    async def find_art_for_mu(self, mu_symbol: str, limit: int = 5) -> List[Dict]:
        """Find art matching a specific Mu."""
        theme = SACRED_THEMES.get(mu_symbol, {})
        queries = theme.get('queries', [])

        all_results = []

        for source in self.sources:
            for query in queries[:2]:  # Limit queries per source
                try:
                    results = await source.search(query, limit=2)
                    all_results.extend(results)
                except Exception as e:
                    print(f"Error searching {source.name}: {e}")

        # Filter to public domain only
        public_domain = [r for r in all_results if r.get('is_public_domain', False)]

        return public_domain[:limit]

    async def find_sacred_geometry(self, limit: int = 20) -> List[Dict]:
        """Find sacred geometry images."""
        queries = [
            "sacred geometry",
            "flower of life",
            "metatron cube",
            "vesica piscis",
            "golden ratio spiral",
            "mandala",
            "sri yantra"
        ]

        all_results = []
        for source in self.sources:
            for query in queries:
                try:
                    results = await source.search(query, limit=3)
                    all_results.extend(results)
                except Exception:
                    continue

        return [r for r in all_results if r.get('is_public_domain', False)][:limit]


# ============ TEST ============

async def test_sources():
    """Test art source APIs."""
    print("Testing Art Sources...")

    met = MetMuseumAPI()
    results = await met.search("sacred geometry", limit=3)
    print(f"\nMet Museum: {len(results)} results")
    for r in results:
        print(f"  - {r['title']} by {r['artist']}")

    aic = ArtInstituteChicagoAPI()
    results = await aic.search("mandala", limit=3)
    print(f"\nArt Institute Chicago: {len(results)} results")
    for r in results:
        print(f"  - {r['title']}")


if __name__ == "__main__":
    asyncio.run(test_sources())
