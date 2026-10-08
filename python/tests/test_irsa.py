import pytest
from spherex.irsa import checked_url, query

def test_checked_url_accepts_valid_irsa_https():
    url = "https://irsa.ipac.caltech.edu/ibe/data/spherex/test.fits"
    assert checked_url(url) == url

def test_checked_url_rejects_insecure_or_external_hosts():
    with pytest.raises(ValueError):
        checked_url("http://irsa.ipac.caltech.edu/test.fits")

    with pytest.raises(ValueError):
        checked_url("https://malicious-site.example.com/test.fits")

def test_query_rejects_invalid_coordinates():
    with pytest.raises(ValueError, match="Invalid coordinates"):
        query(ra=400.0, dec=0.0, radius=0.1)

    with pytest.raises(ValueError, match="Invalid coordinates"):
        query(ra=100.0, dec=-95.0, radius=0.1)

    with pytest.raises(ValueError, match="Invalid coordinates"):
        query(ra=100.0, dec=0.0, radius=2.5)  # radius > 1.0
