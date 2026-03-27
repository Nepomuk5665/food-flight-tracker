<!-- ===================================================== -->
<!--               TRACK MY FOOD • API README              -->
<!-- ===================================================== -->

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&height=220&color=0:111111,100:2f2f2f&text=Open%20Food%20Facts%20API&fontColor=ffffff&fontSize=42&fontAlignY=40&desc=Track%20My%20Food%20•%20API%20Guide&descAlignY=60&animation=fadeIn" alt="banner" />

<br/>

[![Open Food Facts](https://img.shields.io/badge/Open%20Food%20Facts-API-black?style=for-the-badge)](https://world.openfoodfacts.org/)
[![API Version](https://img.shields.io/badge/API-v2-white?style=for-the-badge&logo=swagger&logoColor=black)](https://world.openfoodfacts.org/)
[![Format](https://img.shields.io/badge/Format-JSON-black?style=for-the-badge)](#)
[![REST](https://img.shields.io/badge/Style-REST-white?style=for-the-badge)](#)
[![Open Data](https://img.shields.io/badge/Data-Open-black?style=for-the-badge)](#)

<br/>

<img src="https://readme-typing-svg.herokuapp.com?font=Inter&weight=600&size=24&pause=1000&color=111111&center=true&vCenter=true&width=900&lines=Scan+products.;Fetch+nutrition+data.;Read+Nutri-Score.;Build+food+traceability+features.;Power+Track+My+Food+with+Open+Food+Facts." alt="typing animation" />

</div>

---

# Open Food Facts API Guide

A clean and modern API guide for integrating the **Open Food Facts API** into the **Track My Food** project.

This API can help us:

- scan a product by barcode
- fetch nutrition data
- retrieve product metadata
- display Nutri-Score information
- enrich product detail screens
- support food transparency and traceability features

---

## Overview

**Open Food Facts** is an open food product database made for public reuse.  
It provides product information such as:

- product name
- barcode
- ingredients
- nutriments
- nutrition grades
- categories
- images
- labels and computed values

For our project, this API is especially useful for turning a **barcode scan** into structured product data we can display inside the app.

---

## API Version

> Current stable version: **v2**  
> Next version: **v3** *(still evolving)*

For now, use **v2** in the project.

---

### JSON Eample

```txt
{
    "code": "3017624010701",
    "product": {
    "product_name": "Nutella",
    "nutrition_grades": "e",
    "nutriscore_data": {
    "energy": 2255,
    "energy_points": 6,
    "sugars_points": 10
},
    "nutriments": 
    {
    "energy-kcal": 539,
    "sugars": 56.3
    }
},
    "status": 1,
    "status_verbose": "product found"
}
```

## Environments

### Production
```txt
https://world.openfoodfacts.org