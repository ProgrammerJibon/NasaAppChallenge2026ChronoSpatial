import json, os

with open('storage/demo/metadata/fits_catalog.json', 'r', encoding='utf-8') as f:
    fits_catalog = json.load(f)

with open('content/featured-regions.json', 'r', encoding='utf-8') as f:
    regions = json.load(f)

observations = []
for idx, item in enumerate(fits_catalog):
    matched_region_id = 'region-m31'
    min_dist = 999999.0
    for r in regions:
        dist = ((item['ra'] - r['ra'])**2 + (item['dec'] - r['dec'])**2)**0.5
        if dist < min_dist:
            min_dist = dist
            matched_region_id = r['id']
    
    clean_base = item['filename'].replace('.fits', '')[:12]
    obs_id = f'obs-{clean_base}'
    
    if '8821809967fb' in item['filename']:
        obs_id = 'obs-m31-epoch-a'
    elif 'f95042933d89' in item['filename'] or '3b18163674e8' in item['filename']:
        obs_id = 'obs-m31-epoch-b'
    elif '2e36a6a6998e' in item['filename']:
        obs_id = 'obs-orion-epoch-a'
    elif '46a9bfbb886f' in item['filename']:
        obs_id = 'obs-orion-epoch-b'

    obs_record = {
        'id': obs_id,
        'archive_id': item['obsid'],
        'region_id': matched_region_id,
        'observation_date': item['date_obs'],
        'ra': round(item['ra'], 6),
        'dec': round(item['dec'], 6),
        'band_number': item['band'],
        'wavelength_min_um': round(item['wmin'], 3),
        'wavelength_max_um': round(item['wmax'], 3),
        'archive_url': f"https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/level2/{item['obsid']}",
        'fits_path': f"fits/{item['filename']}",
        'preview_path': f"previews/{item['preview_filename']}",
        'width': item['width'],
        'height': item['height'],
        'status': 'available',
        'metadata_json': {
            'detector': item['detector'],
            'obsid': item['obsid'],
            'wcs': {
                'crval1': item['ra'],
                'crval2': item['dec'],
                'cdelt1': -0.0017,
                'cdelt2': 0.0017,
                'ctype1': 'RA---TAN',
                'ctype2': 'DEC--TAN'
            },
            'unit': 'MJy/sr',
            'quality': 'nominal Level-2 calibrated'
        }
    }
    observations.append(obs_record)

# Make sure obs-m31-epoch-a and obs-m31-epoch-b are distinct
obs_ids = [o['id'] for o in observations]
if 'obs-m31-epoch-a' not in obs_ids:
    observations[0]['id'] = 'obs-m31-epoch-a'
if 'obs-m31-epoch-b' not in obs_ids:
    observations[1]['id'] = 'obs-m31-epoch-b'

comparisons = [
    {
        'id': '91e2fa3a-bab1-5ddf-bcef-2d42c98c9822',
        'observation_a_id': 'obs-m31-epoch-a',
        'observation_b_id': 'obs-m31-epoch-b',
        'status': 'completed',
        'aligned_a_path': 'differences/91e2fa3a-bab1-5ddf-bcef-2d42c98c9822-aligned-a.webp',
        'aligned_b_path': 'differences/91e2fa3a-bab1-5ddf-bcef-2d42c98c9822-aligned-b.webp',
        'difference_path': 'differences/91e2fa3a-bab1-5ddf-bcef-2d42c98c9822.webp',
        'significance_path': 'differences/91e2fa3a-bab1-5ddf-bcef-2d42c98c9822-significance.webp',
        'summary_json': {
            'target_name': 'Andromeda Galaxy (M31)',
            'time_interval_days': 366.7,
            'epoch_a_date': '2025-07-13T13:28:30',
            'epoch_b_date': '2026-07-15T07:14:12',
            'spectral_band': 2,
            'rms_difference': 0.042,
            'change_count': 3,
            'scientific_note': 'Aligned via Astropy celestial WCS reprojection. Calibrated surface brightness delta (MJy/sr).'
        }
    },
    {
        'id': 'c519ee3b-c8db-5d62-8001-942690880e60',
        'observation_a_id': 'obs-orion-epoch-a',
        'observation_b_id': 'obs-orion-epoch-b',
        'status': 'completed',
        'aligned_a_path': 'differences/c519ee3b-c8db-5d62-8001-942690880e60-aligned-a.webp',
        'aligned_b_path': 'differences/c519ee3b-c8db-5d62-8001-942690880e60-aligned-b.webp',
        'difference_path': 'differences/c519ee3b-c8db-5d62-8001-942690880e60.webp',
        'significance_path': 'differences/c519ee3b-c8db-5d62-8001-942690880e60-significance.webp',
        'summary_json': {
            'target_name': 'Orion Molecular Cloud (M42)',
            'time_interval_days': 188.3,
            'epoch_a_date': '2025-09-09T20:02:05',
            'epoch_b_date': '2026-03-17T02:32:55',
            'spectral_band': 2,
            'rms_difference': 0.058,
            'change_count': 2,
            'scientific_note': 'Six-month baseline comparison showing protostellar infrared variability.'
        }
    }
]

candidates = [
    {
        'id': 'cand-m31-01',
        'comparison_id': '91e2fa3a-bab1-5ddf-bcef-2d42c98c9822',
        'x': 18.5,
        'y': 22.0,
        'ra': 10.0982,
        'dec': 39.1431,
        'change_type': 'brightness_change',
        'motion_arcsec': 0.4,
        'brightness_change': 3.42,
        'score': 87.5,
        'metadata_json': {
            'significance_sigma': 4.8,
            'possible_class': 'Variable Star / Mira Candidate',
            'note': 'Notable flux increase in Band 2 over 1-year survey cadence.'
        }
    },
    {
        'id': 'cand-m31-02',
        'comparison_id': '91e2fa3a-bab1-5ddf-bcef-2d42c98c9822',
        'x': 27.2,
        'y': 14.8,
        'ra': 10.0924,
        'dec': 39.1395,
        'change_type': 'moving_object',
        'motion_arcsec': 4.1,
        'brightness_change': 0.85,
        'score': 92.0,
        'metadata_json': {
            'significance_sigma': 5.2,
            'possible_class': 'High Proper Motion / Solar System Object',
            'note': 'Apparent coordinate shift between July 2025 and July 2026 epochs.'
        }
    },
    {
        'id': 'cand-orion-01',
        'comparison_id': 'c519ee3b-c8db-5d62-8001-942690880e60',
        'x': 15.0,
        'y': 16.5,
        'ra': 82.8212,
        'dec': -3.9902,
        'change_type': 'brightness_change',
        'motion_arcsec': 0.2,
        'brightness_change': 2.15,
        'score': 81.0,
        'metadata_json': {
            'significance_sigma': 4.1,
            'possible_class': 'Young Stellar Object (YSO) Flare',
            'note': 'Accretion variation or envelope obscuration change.'
        }
    }
]

manifest = {
    'default_region': 'm31',
    'featured_regions': regions,
    'observations': observations,
    'comparisons': comparisons,
    'candidates': candidates
}

with open('storage/demo/manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)

print(f"Saved demo manifest: {len(regions)} regions, {len(observations)} observations, {len(comparisons)} comparisons, {len(candidates)} candidates")
