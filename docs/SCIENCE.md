# Chrono & Spatial — SPHEREx Scientific Methodology

---

## 1. The SPHEREx Instrument & Survey Cadence

The **Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer (SPHEREx)** is a NASA Medium-Class Explorer (MIDEX) mission designed to survey the entire sky four times over a nominal two-year period.

### 1.1 Cadence
SPHEREx scans in a sun-synchronous low Earth orbit. The spacecraft steps through an all-sky pattern every six months. Consequently, any given patch of the celestial sphere is revisited approximately every 180 days, producing multiple distinct temporal epochs.

### 1.2 The 102 Spectral Channels vs 6 Detector Arrays
A common misconception is that the SPHEREx archive consists of 102 distinct monochrome full-sky images. In reality:
- SPHEREx contains **six 2048×2048 Hawaii-2RG (H2RG) detector arrays**.
- Each detector array is coupled with a **Linear Variable Filter (LVF)**.
- In an LVF, the bandpass transmitted varies continuously across the spatial dimension of the detector.
- Across the six detectors, the wavelength span is divided as follows:
  - **Band 1**: 0.75 – 1.11 µm
  - **Band 2**: 1.11 – 1.64 µm
  - **Band 3**: 1.64 – 2.42 µm
  - **Band 4**: 2.42 – 3.82 µm
  - **Band 5**: 3.82 – 4.42 µm
  - **Band 6**: 4.42 – 5.00 µm
- When the satellite slews across an astronomical target, successive exposures sample the source across varying positions along the LVF dispersion axis, synthesizing **102 effective spectral resolution elements** ($R \sim 40$ to $130$).
- Single-exposure **Level-2 calibrated products** recorded in the NASA/IPAC IRSA archive represent a spatial slice through one detector array, with an accompanying `WCS-WAVE` lookup table describing the continuous wavelength map.

---

## 2. Temporal Comparison Methodology

Comparing two astronomical images to isolate transient or moving sources requires rigorous data reduction:

### 2.1 Celestial Astrometric Reprojection
Due to slight pointing offsets, spacecraft roll angles, and optical distortion, pixels from Epoch B do not map 1:1 to Epoch A.
- Epoch A defines the reference World Coordinate System (WCS).
- Epoch B is interpolated onto Epoch A's celestial grid using bilinear resampling (`reproject_interp` or equivalent bilinear astrometric transformation).

### 2.2 Wavelength Matching Gate
Because astronomical sources exhibit complex spectral energy distributions (SEDs), subtracting two images taken at vastly different wavelengths produces spurious color gradients rather than true temporal variability.
- The pipeline checks that the mean calibrated wavelength of Epoch A and Epoch B match within **2%** tolerance ($\Delta \lambda / \lambda < 0.02$) before permitting flux subtraction.

### 2.3 Background Matching & Normalization
SPHEREx observes through diffuse interplanetary zodiacal light and cosmic infrared background (CIB), both of which fluctuate with seasonal viewing angles.
- The pipeline applies **sigma-clipped background estimation** (median $\pm 3\sigma$) on both epochs to match sky backgrounds.
- The calibrated delta image represents real astronomical surface brightness changes in units of **MegaJanskys per steradian (MJy/sr)**:
  $$\Delta I(x, y) = I_B(x, y) - I_A(x, y) - (B_B - B_A)$$

### 2.4 Significance Mapping ($\sigma$)
To prevent noise spikes from being classified as real astrophysical changes, each difference image is divided by the propagated uncertainty:
- The SPHEREx Level-2 FITS files contain a `VARIANCE` extension ($\sigma^2$).
- Propagated pixel variance is:
  $$\sigma_{\Delta}^2(x, y) = \sigma_A^2(x, y) + \sigma_{B,\text{reproj}}^2(x, y)$$
- The significance map is expressed in signal-to-noise ratio:
  $$S(x, y) = \frac{\Delta I(x, y)}{\sqrt{\sigma_{\Delta}^2(x, y)}}$$

---

## 3. Candidate Extraction & Classification

Automated candidate extraction is executed using the `photutils.detection.DAOStarFinder` algorithm configured for near-infrared point spread functions (FWHM $\sim 2.5$ pixels):

1. **Detection Threshold**: Peaks in the significance map exceeding $5\sigma$ are isolated as candidate centroids.
2. **Astrometric Cross-Match**: Centroid coordinates $(x, y)$ are projected into celestial coordinates $(\alpha, \delta)$ (J2000 Right Ascension and Declination).
3. **Change Classification**:
   - **Dipole Pattern (Negative peak adjacent to positive peak)**: High Proper Motion Star, Asteroid, or Comet.
   - **Monopole Peak with Positive Flux**: Transient, Supernova, Nova, or Outbursting Protostar.
   - **Monopole Peak with Negative Flux**: Faded transient or eclipsing system.
   - **Diffused Extended Residual**: Cometary coma or nebulous variable reflection.

---

## 4. Scientific Disclaimer

> **Important**: In astronomical surveys, a point-source "candidate" is not a confirmed discovery. Residual resampling artifacts, unflagged cosmic ray strikes, bad pixels, and optical PSF variations can mimic transient signatures. Independent follow-up and spectroscopic confirmation are mandatory.
