"""Rank Tiers & Divisions helper.

Tiers:
- Bronze: 0 - 1049 (🥉)
- Silver: 1050 - 1199 (🥈)
- Gold: 1200 - 1399 (🥇)
- Platinum: 1400 - 1599 (💎)
- Diamond: 1600 - 1799 (💠)
- Grandmaster: 1800+ (👑)
"""

RANK_TIERS = [
    {"name": "Grandmaster", "badge": "👑", "min_rating": 1800, "color": "#ffd700"},
    {"name": "Diamond", "badge": "💠", "min_rating": 1600, "color": "#00f2fe"},
    {"name": "Platinum", "badge": "💎", "min_rating": 1400, "color": "#a855f7"},
    {"name": "Gold", "badge": "🥇", "min_rating": 1200, "color": "#e100ff"},
    {"name": "Silver", "badge": "🥈", "min_rating": 1050, "color": "#c0c0c0"},
    {"name": "Bronze", "badge": "🥉", "min_rating": 0, "color": "#cd7f32"},
]


def get_rank_tier(rating: int) -> dict:
    for tier in RANK_TIERS:
        if rating >= tier["min_rating"]:
            return tier
    return RANK_TIERS[-1]
