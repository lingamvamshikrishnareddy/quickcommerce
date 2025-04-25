import pandas as pd
import numpy as np
from pymongo import MongoClient
from typing import Dict, List, Tuple
import re
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import tkinter as tk
from tkinter import filedialog, ttk
import threading
from queue import Queue
import concurrent.futures
import os
from datetime import datetime

class ProductCategorizer:
    def __init__(self):
        self.model = SentenceTransformer('paraphrase-MiniLM-L6-v2')
        self.setup_category_rules()
        self.initialize_embeddings()

    def setup_category_rules(self):
        self.category_rules = {
            "Electronics": {
                "Home Appliances": {
                    "keywords": [
                        "iron", "cooktop", "chopper", "mixer", "toaster", "steam iron", "dry iron",
                        "refrigerator", "washing machine", "air conditioner", "microwave", "dishwasher",
                        "water purifier", "vacuum cleaner", "mixer grinder", "kettle", "air fryer",
                        "food processor", "juicer", "blender", "oven", "heater", "fan"
                    ],
                    "brands": [
                        "philips", "havells", "prestige", "black + decker", "borosil", "samsung",
                        "lg", "whirlpool", "godrej", "haier", "panasonic", "kent", "eureka forbes",
                        "butterfly", "bajaj", "crompton", "orient", "kenstar"
                    ],
                    "patterns": [
                        r"\d+\s*w(?:att)?s?\b",
                        r"(?:steam|dry)\s+iron",
                        r"(?:electric|induction)\s+(?:cooktop|chopper)",
                        r"\d+\s*(?:l|litre|liter)s?\b",
                        r"\d+\s*(?:kg|kilogram)s?\b",
                        r"(?:front|top)\s+load(?:ing)?\s+washing\s+machine",
                        r"(?:single|double)\s+door\s+(?:fridge|refrigerator)",
                        r"\d+\s*(?:ton|tr)\s+(?:ac|air\s+conditioner)",
                        r"(?:ro|uv|uf)\s+water\s+purifier"
                    ]
                },
                "Audio Devices": {
                    "keywords": [
                        "speaker", "headphone", "earbud", "audio", "soundbar", "tws", "neckband",
                        "microphone", "subwoofer", "amplifier", "stereo", "bass", "earphones",
                        "noise cancelling", "gaming headset"
                    ],
                    "brands": [
                        "boat", "jbl", "sony", "bose", "apple", "samsung", "oneplus", "realme",
                        "noise", "zebronics", "marshall", "sennheiser", "skullcandy"
                    ],
                    "patterns": [
                        r"bluetooth\s+(?:speaker|headphone|earbud|earphone)",
                        r"wireless\s+(?:speaker|headphone|earbud|earphone)",
                        r"(?:active|passive)\s+noise\s+cancell?(?:ing|ation)",
                        r"(?:true|tws)\s+wireless\s+(?:stereo|earbuds?|earphones?)",
                        r"\d+\s*(?:mm|millimeter)\s+driver",
                        r"(?:over|on)\-ear\s+headphones?",
                        r"(?:in|around)\-ear\s+(?:headphone|monitor)s?"
                    ]
                },
                "Smartphones & Accessories": {
                    "keywords": [
                        "phone", "smartphone", "charger", "power bank", "case", "screen guard",
                        "holder", "cable", "adapter", "wireless charger", "phone grip", "stylus"
                    ],
                    "brands": [
                        "apple", "samsung", "oneplus", "xiaomi", "realme", "vivo", "oppo",
                        "nothing", "google", "motorola", "belkin", "anker", "spigen"
                    ],
                    "patterns": [
                        r"\d+\s*(?:gb|tb)\s+(?:ram|storage)",
                        r"(?:fast|quick|rapid)\s+charg(?:ing|er)",
                        r"(?:type-?c|lightning|micro-?usb)\s+(?:cable|connector)",
                        r"\d+\s*w(?:att)?\s+(?:charger|charging)",
                        r"(?:tempered|gorilla)\s+glass",
                        r"(?:magnetic|wireless)\s+charg(?:ing|er)"
                    ]
                }
            },
            "Fashion & Accessories": {
                "Men's Fashion": {
                    "keywords": [
                        "shirt", "t-shirt", "jeans", "trousers", "pants", "suit", "blazer",
                        "kurta", "jacket", "sweater", "hoodie", "shorts", "underwear", "socks",
                        "ethnic wear", "traditional wear"
                    ],
                    "brands": [
                        "levis", "pepe", "allen solly", "van heusen", "peter england", "zara",
                        "h&m", "manyavar", "fabindia", "nike", "adidas", "puma", "gap"
                    ],
                    "patterns": [
                        r"(?:formal|casual|slim\s+fit|regular\s+fit)\s+(?:shirt|trouser|pant)",
                        r"(?:round|v|polo)\s+neck\s+t-shirt",
                        r"(?:slim|straight|regular|skinny)\s+(?:fit|cut)\s+jeans",
                        r"(?:cotton|linen|denim|wool)\s+(?:shirt|trouser|jacket)",
                        r"(?:full|half)\s+sleeve\s+(?:shirt|t-shirt)",
                        r"(?:traditional|festive|wedding)\s+wear"
                    ]
                },
                "Women's Fashion": {
                    "keywords": [
                        "dress", "top", "saree", "kurti", "lehenga", "salwar", "jeans",
                        "skirt", "blouse", "dupatta", "palazzo", "jumpsuit", "lingerie",
                        "ethnic wear", "western wear"
                    ],
                    "brands": [
                        "zara", "h&m", "forever 21", "manyavar", "fabindia", "biba", "w",
                        "and", "nike", "adidas", "puma", "marks & spencer", "levis"
                    ],
                    "patterns": [
                        r"(?:maxi|midi|mini)\s+dress",
                        r"(?:a-line|pleated|pencil)\s+skirt",
                        r"(?:silk|cotton|georgette|chiffon)\s+saree",
                        r"(?:anarkali|straight|flared)\s+kurti",
                        r"(?:designer|bridal|party)\s+(?:lehenga|saree)",
                        r"(?:high|mid|low)\s+waist\s+(?:jeans|pants)"
                    ]
                }
            },
            "Beauty & Personal Care": {
                "Skincare": {
                    "keywords": [
                        "face wash", "moisturizer", "sunscreen", "serum", "face mask",
                        "toner", "eye cream", "lip balm", "face scrub", "night cream",
                        "acne treatment", "anti-aging"
                    ],
                    "brands": [
                        "himalaya", "neutrogena", "nivea", "loreal", "garnier", "mamaearth",
                        "biotique", "plum", "the body shop", "cetaphil", "clinique"
                    ],
                    "patterns": [
                        r"(?:oil|combination|dry|sensitive)\s+skin",
                        r"(?:spf|pa)\s*\d+",
                        r"(?:day|night|anti-aging)\s+cream",
                        r"(?:vitamin\s+c|hyaluronic\s+acid|retinol)\s+serum",
                        r"(?:clay|sheet|peel-off)\s+mask",
                        r"(?:gentle|deep)\s+cleansing"
                    ]
                },
                "Makeup": {
                    "keywords": [
                        "foundation", "concealer", "lipstick", "mascara", "eyeliner",
                        "eyeshadow", "blush", "bronzer", "primer", "makeup brush",
                        "compact", "kajal", "nail polish"
                    ],
                    "brands": [
                        "maybelline", "loreal", "mac", "lakme", "nykaa", "sugar", "colorbar",
                        "kay beauty", "huda beauty", "faces canada"
                    ],
                    "patterns": [
                        r"(?:matte|glossy|cream|liquid)\s+lipstick",
                        r"(?:waterproof|volumizing|lengthening)\s+mascara",
                        r"(?:liquid|pencil|gel)\s+(?:eyeliner|kajal)",
                        r"(?:loose|pressed|translucent)\s+powder",
                        r"(?:full|medium|light)\s+coverage\s+foundation"
                    ]
                }
            },
            "Sports & Fitness": {
                "Exercise Equipment": {
                    "keywords": [
                        "treadmill", "exercise bike", "yoga mat", "dumbbells", "resistance bands",
                        "gym bench", "weight plates", "rowing machine", "cross trainer",
                        "skipping rope", "gym gloves"
                    ],
                    "brands": [
                        "decathlon", "cosco", "cult.fit", "powermax", "fitkit", "lifelong",
                        "nike", "reebok", "adidas", "puma"
                    ],
                    "patterns": [
                        r"\d+\s*(?:kg|lb)s?\s+(?:dumbbell|weight)",
                        r"(?:manual|motorized)\s+treadmill",
                        r"(?:recumbent|upright|spin)\s+bike",
                        r"(?:foam|exercise|yoga)\s+(?:mat|roller)",
                        r"(?:adjustable|flat|incline)\s+bench"
                    ]
                },
                "Sports Equipment": {
                    "keywords": [
                        "cricket bat", "football", "basketball", "badminton", "tennis",
                        "table tennis", "volleyball", "hockey", "boxing", "swimming",
                        "cycling"
                    ],
                    "brands": [
                        "mrf", "sg", "nike", "adidas", "yonex", "wilson", "cosco",
                        "spalding", "kookaburra", "new balance"
                    ],
                    "patterns": [
                        r"(?:english|kashmir)\s+willow\s+bat",
                        r"(?:leather|synthetic)\s+(?:football|basketball)",
                        r"(?:graphite|aluminum)\s+(?:racket|racquet)",
                        r"(?:competition|training|match)\s+grade",
                        r"(?:junior|senior|professional)\s+size"
                    ]
                }
            },
            "Personal Care": {
                "Health & Wellness": {
                    "keywords": [
                        "massager", "massage gun", "hot water bag", "heating pad", "bp monitor",
                        "glucometer", "thermometer", "weighing scale", "nebulizer", "pulse oximeter",
                        "fitness band", "smartwatch", "supplements", "vitamins", "protein powder"
                    ],
                    "brands": [
                        "beatxp", "agaro", "omron", "dr trust", "accu-chek", "dr morepen",
                        "fitbit", "garmin", "optimum nutrition", "muscleblaze", "myprotein"
                    ],
                    "patterns": [
                        r"(?:body|head|neck|foot)\s+massager",
                        r"(?:deep|percussion)\s+massage\s+gun",
                        r"(?:electric|heating)\s+(?:pad|bag)",
                        r"blood\s+(?:pressure|glucose)\s+monitor",
                        r"(?:digital|infrared)\s+thermometer",
                        r"(?:whey|plant)\s+protein",
                        r"vitamin\s+(?:d3|b12|c)",
                        r"(?:pre|post)\s*workout\s+supplement"
                    ]
                }
            },
            "Grocery & Food": {
                "Snacks & Beverages": {
                    "keywords": [
                        "chips", "crisps", "noodles", "snack", "biscuits", "cookies", "nuts",
                        "dried fruits", "chocolate", "candy", "soft drink", "juice", "tea",
                        "coffee", "energy drink", "soda", "namkeen", "mixture"
                    ],
                    "brands": [
                        "lays", "crax", "cheetos", "ritebite", "haldirams", "britannia",
                        "parle", "cadbury", "nestle", "coca-cola", "pepsi", "red bull",
                        "tata", "nescafe", "bru", "tropicana", "real"
                    ],
                    "patterns": [
                        r"(?:potato|corn|veggie)\s+chips",
                        r"(?:hakka|instant|cup)\s+noodles",
                        r"(?:dark|milk|white)\s+chocolate",
                        r"(?:green|black|herbal)\s+tea",
                        r"(?:roasted|salted|flavou?red)\s+(?:nuts|seeds)",
                        r"(?:cream|sandwich|marie)\s+biscuits?",
                        r"(?:energy|sports|health)\s+drink"
                    ]
                },
                "Pantry Essentials": {
                    "keywords": [
                        "oil", "ghee", "atta", "flour", "rice", "dal", "pulses", "spices",
                        "masala", "sugar", "salt", "vinegar", "honey", "jam", "sauce",
                        "pasta", "noodles", "cereals"
                    ],
                    "brands": [
                        "fortune", "saffola", "aashirvaad", "india gate", "tata sampann",
                        "mdh", "everest", "catch", "patanjali", "dabur", "kissan", "maggi"
                    ],
                    "patterns": [
                        r"(?:virgin|cold pressed|refined)\s+(?:coconut|olive|sunflower)\s+oil",
                        r"(?:whole|multi|grain)\s+(?:wheat|grain)\s+(?:atta|flour)",
                        r"(?:basmati|brown|white)\s+rice",
                        r"(?:toor|moong|urad|chana)\s+dal",
                        r"(?:garam|chicken|meat|curry)\s+masala",
                        r"(?:apple|mixed fruit|orange)\s+jam",
                        r"(?:tomato|chilli|soya)\s+sauce"
                    ]
                }
            },
            "Jewelry & Watches": {
                "Fine Jewelry": {
                    "keywords": [
                        "ring", "necklace", "earring", "bracelet", "pendant", "wedding jewelry",
                        "precious stone", "gold jewelry", "diamond", "silver", "gemstone",
                        "pearl", "platinum"
                    ],
                    "brands": [
                        "tanishq", "caratlane", "kalyan jewellers", "malabar gold", "tiffany",
                        "cartier", "pandora", "swarovski"
                    ],
                    "patterns": [
                        r"(?:gold|silver|platinum|diamond)\s+(?:ring|necklace|bracelet)",
                        r"(?:\d+)\s*(?:k|kt|karat)\s+gold",
                        r"(?:precious|semi-precious)\s+(?:stone|gem)",
                        r"(?:natural|cultured)\s+pearl",
                        r"(?:wedding|engagement)\s+(?:ring|band)"
                    ]
                },
                "Watches": {
                    "keywords": [
                        "watch", "smartwatch", "chronograph", "analog", "digital", "automatic",
                        "wristwatch", "smart band", "fitness tracker", "watch strap", "watch battery"
                    ],
                    "brands": [
                        "casio", "titan", "fossil", "seiko", "timex", "rolex", "omega",
                        "garmin", "fitbit", "apple", "samsung"
                    ],
                    "patterns": [
                        r"(?:analog|digital|smart)\s+watch",
                        r"(?:leather|metal|silicon)\s+(?:strap|band)",
                        r"(?:automatic|quartz|mechanical)\s+movement",
                        r"(?:water|splash)\s*(?:proof|resistant)",
                        r"(?:chronograph|multifunction|dress)\s+watch"
                    ]
                }
            },
            "Home & Living": {
                "Furniture": {
                    "keywords": [
                        "chair", "table", "sofa", "bed", "wardrobe", "cabinet", "shelf",
                        "desk", "dining table", "bookshelf", "storage", "seating"
                    ],
                    "brands": [
                        "ikea", "godrej", "nilkamal", "urban ladder", "pepperfry",
                        "durian", "hometown", "woodsworth"
                    ],
                    "patterns": [
                        r"(?:dining|coffee|study|side)\s+table",
                        r"(?:single|double|queen|king)\s+size\s+bed",
                        r"(?:office|gaming|dining)\s+chair",
                        r"(?:l-shaped|sectional)\s+sofa",
                        r"(?:solid|engineered)\s+wood",
                        r"(?:metal|glass|wooden)\s+(?:table|shelf|cabinet)"
                    ]
                },
                "Home Decor": {
                    "keywords": [
                        "wall art", "painting", "cushion", "pillow", "vase", "mirror",
                        "clock", "photo frame", "candle", "showpiece", "artifact",
                        "wall decal", "curtain"
                    ],
                    "brands": [
                        "home centre", "ddecor", "random", "urban ladder", "marvel",
                        "craft world", "wall guru", "ecraftindia"
                    ],
                    "patterns": [
                        r"(?:wall|table|floor)\s+(?:clock|mirror|decor)",
                        r"(?:cotton|polyester|silk)\s+(?:cushion|curtain)",
                        r"(?:decorative|scented)\s+candle",
                        r"(?:abstract|modern|traditional)\s+(?:painting|art)",
                        r"(?:wooden|metal|glass)\s+(?:frame|vase)"
                    ]
                }
            },
            "Smart Home": {
                "Smart Devices": {
                    "keywords": [
                        "smart speaker", "smart bulb", "security camera", "doorbell",
                        "smart lock", "thermostat", "smart plug", "smart switch",
                        "motion sensor", "voice assistant"
                    ],
                    "brands": [
                        "amazon", "google", "philips hue", "tp-link", "xiaomi", "nest",
                        "ring", "eufy", "yale", "arlo"
                    ],
                    "patterns": [
                        r"(?:wifi|bluetooth)\s+(?:enabled|connected)",
                        r"(?:voice|app)\s+controlled",
                        r"(?:smart|automated)\s+(?:home|device|system)",
                        r"(?:motion|temperature|humidity)\s+sensor",
                        r"(?:video|wireless)\s+doorbell",
                        r"(?:rgb|tunable)\s+(?:light|bulb)"
                    ]
                }
            },
            "Toys & Games": {
                "Kids Toys": {
                    "keywords": [
                        "action figure", "doll", "building block", "educational toy", "puzzle",
                        "outdoor toy", "remote control", "board game", "stuffed animal",
                        "art supply", "toy car", "toy kitchen", "toy robot"
                    ],
                    "brands": [
                        "lego", "barbie", "hot wheels", "fisher-price", "nerf", "hasbro",
                        "mattel", "funskool", "vtech", "melissa & doug"
                    ],
                    "patterns": [
                        r"(?:remote|rc)\s+controlled?\s+(?:car|helicopter|drone)",
                        r"(?:educational|learning|stem)\s+toy",
                        r"(?:soft|plush|stuffed)\s+(?:toy|animal)",
                        r"(?:building|construction)\s+(?:blocks?|set)",
                        r"(?:art|craft)\s+(?:set|kit|supply)"
                    ]
                },
                "Video Games": {
                    "keywords": [
                        "gaming console", "video game", "controller", "gaming chair",
                        "vr headset", "gaming headset", "gaming keyboard", "gaming mouse",
                        "playstation", "xbox", "nintendo"
                    ],
                    "brands": [
                        "sony", "microsoft", "nintendo", "logitech", "razer", "corsair",
                        "alienware", "steelseries", "hyperx", "oculus"
                    ],
                    "patterns": [
                        r"(?:gaming|video\s+game)\s+console",
                        r"(?:wireless|wired)\s+controller",
                        r"(?:virtual|vr)\s+(?:reality|headset)",
                        r"(?:gaming|rgb)\s+(?:keyboard|mouse|headset)",
                        r"(?:playstation|ps)\s*[45]"
                    ]
                }
            },
            "Pet Supplies": {
                "Dog Supplies": {
                    "keywords": [
                        "dog food", "dog treat", "dog toy", "dog bed", "dog collar",
                        "dog leash", "dog bowl", "dog carrier", "dog shampoo",
                        "dog brush", "dog clothing", "poop bag"
                    ],
                    "brands": [
                        "pedigree", "royal canin", "purina", "kong", "himalaya",
                        "drools", "beaphar", "waggy", "bark butler"
                    ],
                    "patterns": [
                        r"(?:puppy|adult|senior)\s+dog\s+food",
                        r"(?:dry|wet|canned)\s+dog\s+food",
                        r"(?:chew|dental|training)\s+treats?",
                        r"(?:small|medium|large)\s+breed",
                        r"(?:anti-tick|anti-flea)\s+(?:collar|treatment)"
                    ]
                },
                "Cat Supplies": {
                    "keywords": [
                        "cat food", "cat litter", "cat toy", "cat bed", "cat carrier",
                        "cat tree", "scratching post", "cat bowl", "cat brush",
                        "cat collar", "cat shampoo", "litter box"
                    ],
                    "brands": [
                        "whiskas", "royal canin", "me-o", "temptations", "catsan",
                        "drools", "savic", "trixie", "basix"
                    ],
                    "patterns": [
                        r"(?:kitten|adult|senior)\s+cat\s+food",
                        r"(?:clumping|crystal|natural)\s+(?:litter|sand)",
                        r"(?:automatic|self-cleaning)\s+litter\s+box",
                        r"(?:cat|kitten)\s+(?:tower|condo|tree)",
                        r"(?:sisal|carpet)\s+scratching\s+post"
                    ]
                }
            },
            "Garden & Outdoor": {
                "Gardening": {
                    "keywords": [
                        "plant", "seed", "garden tool", "pot", "planter", "soil",
                        "fertilizer", "garden decor", "watering can", "pruner",
                        "trowel", "garden gloves", "grow bag"
                    ],
                    "brands": [
                        "trugreen", "miracle-gro", "scotts", "black & decker", "fiskars",
                        "gardena", "bosch", "hozelock", "ugaoo"
                    ],
                    "patterns": [
                        r"(?:ceramic|plastic|terracotta)\s+(?:pot|planter)",
                        r"(?:organic|chemical|npk)\s+fertilizer",
                        r"(?:potting|garden|vermi)\s+soil",
                        r"(?:flowering|vegetable|herb)\s+(?:plant|seed)",
                        r"(?:drip|sprinkler)\s+irrigation"
                    ]
                },
                "Outdoor Living": {
                    "keywords": [
                        "patio furniture", "outdoor light", "bbq grill", "garden umbrella",
                        "hammock", "swing", "outdoor cushion", "pool equipment",
                        "garden statue", "bird feeder", "outdoor fan"
                    ],
                    "brands": [
                        "weber", "char-broil", "outsunny", "coleman", "garden glory",
                        "furniturekraft", "garden kraft", "backyard expressions"
                    ],
                    "patterns": [
                        r"(?:gas|charcoal|electric)\s+(?:grill|bbq)",
                        r"(?:solar|led)\s+outdoor\s+light",
                        r"(?:3|4|5)\s+(?:seater|piece)\s+patio\s+set",
                        r"(?:pool|garden|patio)\s+umbrella",
                        r"(?:outdoor|garden|patio)\s+(?:sofa|chair|table)"
                    ]
                }
            },
            "Industrial & Scientific": {
                "Lab & Scientific": {
                    "keywords": [
                        "microscope", "lab equipment", "test tube", "beaker", "pipette",
                        "lab chemical", "measuring cylinder", "safety goggles",
                        "lab coat", "slide", "petri dish", "burner"
                    ],
                    "brands": [
                        "labware", "borosil", "shimadzu", "thermo fisher", "merck",
                        "eppendorf", "cole-parmer", "olympus"
                    ],
                    "patterns": [
                        r"(?:digital|optical|compound)\s+microscope",
                        r"(?:glass|plastic)\s+(?:beaker|tube|flask)",
                        r"(?:electronic|digital|analytical)\s+balance",
                        r"(?:lab|safety|protective)\s+(?:coat|glove|goggle)",
                        r"(?:measurement|testing|analysis)\s+equipment"
                    ]
                },
                "Industrial Tools": {
                    "keywords": [
                        "power tool", "hand tool", "safety equipment", "welding",
                        "material handling", "testing equipment", "industrial storage",
                        "machinery parts", "drill", "grinder", "industrial supplies"
                    ],
                    "brands": [
                        "bosch", "dewalt", "makita", "stanley", "hitachi", "milwaukee",
                        "siemens", "crompton", "snapon"
                    ],
                    "patterns": [
                        r"(?:power|cordless|electric)\s+(?:drill|saw|tool)",
                        r"(?:impact|hammer|rotary)\s+drill",
                        r"(?:angle|bench|surface)\s+grinder",
                        r"(?:safety|industrial|protective)\s+(?:gear|equipment)",
                        r"(?:welding|cutting|grinding)\s+(?:machine|tool)"
                    ]
                }
            },
            "Party & Events": {
                "Party Supplies": {
                    "keywords": [
                        "decoration", "balloon", "party favor", "banner", "party game",
                        "tableware", "disposable plate", "party hat", "streamer",
                        "party popper", "candle", "costume"
                    ],
                    "brands": [
                        "party city", "unique", "amscan", "qualatex", "party props",
                        "funcart", "party hunters", "party king"
                    ],
                    "patterns": [
                        r"(?:birthday|wedding|party)\s+decoration",
                        r"(?:helium|latex|foil)\s+balloon",
                        r"(?:paper|plastic|disposable)\s+(?:plate|cup|cutlery)",
                        r"(?:party|celebration|event)\s+(?:pack|kit|set)",
                        r"(?:theme|character)\s+party\s+supplies"
                    ]
                },
                "Event Planning": {
                    "keywords": [
                        "wedding supply", "birthday decoration", "holiday decoration",
                        "corporate event", "baby shower", "anniversary", "graduation",
                        "invitation card", "return gift", "photo booth"
                    ],
                    "brands": [
                        "event essentials", "wedding star", "party city", "martha stewart",
                        "hallmark", "return favors", "event decor"
                    ],
                    "patterns": [
                        r"(?:wedding|party|event)\s+(?:planner|organizer)",
                        r"(?:theme|custom)\s+decoration",
                        r"(?:invitation|thank\s+you)\s+card",
                        r"(?:photo|selfie)\s+(?:booth|prop)",
                        r"(?:return|party)\s+(?:gift|favor)"
                    ]
                }
            },
            "Books & Media": {
                "Books": {
                    "keywords": [
                        "fiction", "non-fiction", "textbook", "comic", "novel",
                        "self-help", "biography", "cookbook", "children book",
                        "educational book", "religious book", "professional book"
                    ],
                    "brands": [
                        "penguin", "harper collins", "oxford", "pearson", "mcgraw hill",
                        "dk", "marvel", "dc comics", "scholastic"
                    ],
                    "patterns": [
                        r"(?:hard|paper)back\s+book",
                        r"(?:fiction|non-fiction|self-help)\s+book",
                        r"(?:text|reference|guide)\s+book",
                        r"(?:children|kids)\s+(?:book|story)",
                        r"(?:first|limited|special)\s+edition"
                    ]
                },
                "Musical Instruments": {
                    "keywords": [
                        "guitar", "piano", "drum", "violin", "keyboard", "flute",
                        "microphone", "amplifier", "music stand", "guitar string",
                        "drumstick", "music book", "instrument case"
                    ],
                    "brands": [
                        "yamaha", "casio", "fender", "gibson", "roland", "ibanez",
                        "pearl", "shure", "rode", "behringer"
                    ],
                    "patterns": [
                        r"(?:acoustic|electric|bass)\s+guitar",
                        r"(?:digital|grand|upright)\s+piano",
                        r"(?:drum|music)\s+(?:set|kit)",
                        r"(?:recording|studio)\s+equipment",
                        r"(?:wireless|condenser|dynamic)\s+microphone"
                    ]
                }
            },
            "Baby Products": {
                "Baby Care": {
                    "keywords": [
                        "baby toy", "baby carrier", "feeding bottle", "teether", "baby shoe",
                        "diaper", "crib", "stroller", "pram", "car seat", "carry cot",
                        "baby wipe", "baby lotion", "baby powder", "baby oil"
                    ],
                    "brands": [
                        "pampers", "huggies", "johnson & johnson", "chicco", "fisher-price",
                        "graco", "mothercare", "mee mee", "himalaya baby", "mamaearth"
                    ],
                    "patterns": [
                        r"(?:infant|baby|toddler)\s+(?:toy|carrier|shoes)",
                        r"(?:nursing|feeding)\s+(?:bottle|pillow|cover)",
                        r"(?:disposable|cloth)\s+(?:diaper|nappy)",
                        r"(?:stroller|pram)\s+(?:cover|accessory)",
                        r"(?:baby|infant)\s+car\s+seat"
                    ]
                }
            },
            "Automotive": {
                "Cars & Motorbike": {
                    "keywords": [
                        "microfiber cloth", "helmet", "car cover", "bike cover", "car shampoo",
                        "glove", "neck rest", "back rest", "car mat", "bike accessory",
                        "car perfume", "car charger", "tire inflator", "brake pad"
                    ],
                    "brands": [
                        "3m", "bosch", "castrol", "turtle wax", "gulf", "mobil", "vega",
                        "studds", "steelbird", "royal enfield"
                    ],
                    "patterns": [
                        r"(?:full|half|open)\s+face\s+helmet",
                        r"(?:car|bike|vehicle)\s+(?:cover|accessory)",
                        r"(?:leather|fabric)\s+(?:seat|neck)\s+(?:cover|rest)",
                        r"(?:front|rear|complete)\s+brake\s+(?:pad|shoe)",
                        r"(?:engine|gear|brake)\s+oil"
                    ]
                }
            },
            "Health & Beauty": {
                "Hair Care": {
                    "keywords": [
                        "shampoo", "conditioner", "hair oil", "hair mask", "hair serum",
                        "hair color", "hair treatment", "scalp care", "dry shampoo",
                        "hair styling", "hair brush", "hair dryer"
                    ],
                    "brands": [
                        "loreal", "dove", "pantene", "tresemme", "head & shoulders",
                        "mamaearth", "wow", "indulekha", "matrix", "wella"
                    ],
                    "patterns": [
                        r"(?:anti|anti-)\s*(?:dandruff|hairfall|frizz)",
                        r"(?:color|damage|keratin)\s+treatment",
                        r"(?:natural|herbal|ayurvedic)\s+hair\s+(?:oil|care)",
                        r"(?:hot|cold)\s+air\s+(?:brush|dryer)",
                        r"(?:professional|salon)\s+(?:shampoo|treatment)"
                    ]
                },
                "Beauty & Makeup": {
                    "keywords": [
                        "foundation", "concealer", "lipstick", "eyeshadow", "mascara",
                        "eyeliner", "blush", "bronzer", "makeup brush", "nail polish",
                        "primer", "setting spray", "makeup remover"
                    ],
                    "brands": [
                        "maybelline", "lakme", "mac", "nyx", "sugar", "loreal", "revlon",
                        "colorbar", "kay beauty", "faces canada"
                    ],
                    "patterns": [
                        r"(?:matte|glossy|liquid)\s+lipstick",
                        r"(?:waterproof|volumizing)\s+mascara",
                        r"(?:liquid|powder|cream)\s+foundation",
                        r"(?:eyeshadow|makeup)\s+palette",
                        r"(?:makeup|beauty)\s+(?:tool|brush|sponge)"
                    ]
                },
                "Health Care": {
                    "keywords": [
                        "medicine", "first aid", "supplement", "vitamin", "ayurvedic",
                        "bandage", "antiseptic", "pain relief", "digestive", "immunity",
                        "health drink", "protein powder"
                    ],
                    "brands": [
                        "himalaya", "dabur", "patanjali", "zandu", "baidyanath",
                        "ensure", "horlicks", "vicks", "dettol", "savlon"
                    ],
                    "patterns": [
                        r"(?:herbal|ayurvedic)\s+(?:medicine|supplement)",
                        r"(?:pain|fever|cold)\s+relief",
                        r"(?:vitamin|mineral)\s+supplement",
                        r"(?:first|medical)\s+aid\s+kit",
                        r"(?:health|immunity)\s+(?:booster|supplement)"
                    ]
                }
            },
            "Home & Personal Care": {
                "Washing & Laundry": {
                    "keywords": [
                        "detergent", "fabric softener", "washing machine", "stain remover",
                        "bleach", "laundry bag", "clothes line", "dryer sheet",
                        "washing powder", "liquid detergent"
                    ],
                    "brands": [
                        "surf excel", "ariel", "tide", "comfort", "vim", "rin", "wheel",
                        "ghadi", "nirma", "ujala"
                    ],
                    "patterns": [
                        r"(?:front|top)\s+load(?:ing)?\s+(?:detergent|powder)",
                        r"(?:liquid|powder)\s+detergent",
                        r"(?:fabric|wool|delicate)\s+(?:wash|care)",
                        r"(?:stain|dirt)\s+removal",
                        r"(?:machine|hand)\s+wash"
                    ]
                },
                "Household Cleaning": {
                    "keywords": [
                        "floor cleaner", "glass cleaner", "bathroom cleaner",
                        "kitchen cleaner", "disinfectant", "room freshener",
                        "pest control", "cleaning brush", "mop", "wiper"
                    ],
                    "brands": [
                        "lizol", "colin", "harpic", "domex", "mortein", "goodknight",
                        "vim", "scotch brite", "odonil", "godrej"
                    ],
                    "patterns": [
                        r"(?:all|multi)\s*purpose\s+cleaner",
                        r"(?:floor|glass|surface)\s+(?:cleaner|wipe)",
                        r"(?:bathroom|kitchen|toilet)\s+cleaner",
                        r"(?:air|room)\s+freshener",
                        r"(?:pest|insect)\s+(?:control|spray)"
                    ]
                },
                "Shaving & Grooming": {
                    "keywords": [
                        "shaving cream", "razor", "blade", "beard oil", "trimmer",
                        "aftershave", "waxing strip", "hair removal", "shaving brush",
                        "electric shaver", "beard wash", "beard comb"
                    ],
                    "brands": [
                        "gillette", "philips", "braun", "veet", "old spice", "park avenue",
                        "beardo", "ustraa", "axe", "nivea men"
                    ],
                    "patterns": [
                        r"(?:electric|manual|safety)\s+razor",
                        r"(?:beard|mustache)\s+(?:oil|wash|balm)",
                        r"(?:cold|hot|ready)\s+wax\s+strips?",
                        r"(?:pre|post)\s+shave",
                        r"(?:disposable|cartridge)\s+(?:razor|blade)"
                    ]
                }
            }
        }

        # Generate embeddings for categories
    def initialize_embeddings(self):
        """Initialize embeddings for categories"""
        self.category_embeddings = {}
        for category, subcats in self.category_rules.items():
            for subcat, rules in subcats.items():
                text = f"{category} {subcat} {' '.join(rules['keywords'])}"
                self.category_embeddings[f"{category}|{subcat}"] = self.model.encode([text])[0]

    def preprocess_text(self, text: str) -> str:
        """Preprocess product name"""
        text = str(text).lower().strip()
        text = re.sub(r'[^\w\s/-]', ' ', text)
        return ' '.join(text.split())

    def get_rule_based_category(self, product_name: str) -> Tuple[str, str, float]:
        """Get category based on rules"""
        product_name = self.preprocess_text(product_name)

        best_match = ("Uncategorized", "Uncategorized", 0.0)
        max_score = 0.0

        for category, subcats in self.category_rules.items():
            for subcat, rules in subcats.items():
                score = 0.0

                # Check keywords
                keywords = set(rules.get('keywords', []))
                product_words = set(product_name.split())
                matching_keywords = keywords.intersection(product_words)
                if matching_keywords:
                    score += len(matching_keywords) / len(keywords) * 0.4

                # Check brands
                brands = set(rules.get('brands', []))
                if any(brand.lower() in product_name for brand in brands):
                    score += 0.3

                # Check patterns
                patterns = rules.get('patterns', [])
                for pattern in patterns:
                    if re.search(pattern, product_name):
                        score += 0.3
                        break

                if score > max_score:
                    max_score = score
                    best_match = (category, subcat, score)

        return best_match

    def get_semantic_category(self, product_name: str) -> Tuple[str, str, float]:
        """Get category based on semantic similarity"""
        product_embedding = self.model.encode([product_name])[0]

        best_match = ("Uncategorized", "Uncategorized", 0.0)
        max_similarity = 0.0

        for cat_key, cat_embedding in self.category_embeddings.items():
            similarity = cosine_similarity([product_embedding], [cat_embedding])[0][0]
            if similarity > max_similarity:
                max_similarity = similarity
                category, subcategory = cat_key.split('|')
                best_match = (category, subcategory, similarity)

        return best_match

    def categorize_product(self, product_name: str) -> Tuple[str, str, float]:
        """Categorize product using multiple methods"""
        rule_based = self.get_rule_based_category(product_name)
        semantic_based = self.get_semantic_category(product_name)

        # Use rule-based if confidence is high enough
        if rule_based[2] >= 0.6:
            return rule_based
        # Use semantic-based if its confidence is higher
        elif semantic_based[2] > rule_based[2]:
            return semantic_based

        return rule_based

    def export_to_mongodb(self, data: pd.DataFrame, connection_string: str, db_name: str, collection_name: str):
        """Export categorized data to MongoDB"""
        client = MongoClient(connection_string)
        db = client[db_name]
        collection = db[collection_name]

        records = data.to_dict('records')
        collection.insert_many(records)

        client.close()

class ProductCategorizerUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Product Categorizer")
        self.root.geometry("600x400")
        self.setup_ui()
        self.categorizer = ProductCategorizer()
        self.processing = False

    def setup_ui(self):
        # File selection
        frame = ttk.Frame(self.root, padding="10")
        frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        ttk.Button(frame, text="Select Input File", command=self.select_input_file).grid(row=0, column=0, padx=5, pady=5)
        self.input_label = ttk.Label(frame, text="No file selected")
        self.input_label.grid(row=0, column=1, padx=5, pady=5)

        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress = ttk.Progressbar(frame, length=400, mode='determinate', variable=self.progress_var)
        self.progress.grid(row=1, column=0, columnspan=2, padx=5, pady=5)

        # Status label
        self.status_label = ttk.Label(frame, text="")
        self.status_label.grid(row=2, column=0, columnspan=2, padx=5, pady=5)

        # MongoDB settings
        ttk.Label(frame, text="MongoDB URI:").grid(row=3, column=0, padx=5, pady=5)
        self.mongo_uri = ttk.Entry(frame, width=40)
        self.mongo_uri.insert(0, "mongodb://localhost:27017/")
        self.mongo_uri.grid(row=3, column=1, padx=5, pady=5)

        # Process button
        self.process_button = ttk.Button(frame, text="Process Data", command=self.start_processing)
        self.process_button.grid(row=4, column=0, columnspan=2, padx=5, pady=5)

    def select_input_file(self):
        filename = filedialog.askopenfilename(
            title="Select CSV File",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
        )
        if filename:
            self.input_file = filename
            self.input_label.config(text=os.path.basename(filename))

    def update_progress(self, value):
        self.progress_var.set(value)
        self.root.update_idletasks()

    def update_status(self, message):
        self.status_label.config(text=message)
        self.root.update_idletasks()

    def start_processing(self):
        if not hasattr(self, 'input_file') or self.processing:
            return

        self.processing = True
        self.process_button.state(['disabled'])
        threading.Thread(target=self.process_data, daemon=True).start()

    def process_data(self):
        try:
            # Read data
            df = pd.read_csv(self.input_file)
            total_rows = len(df)
            self.update_status(f"Processing {total_rows} products...")

            # Create output directory if it doesn't exist
            output_dir = "output"
            os.makedirs(output_dir, exist_ok=True)

            # Generate output filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(output_dir, f"categorized_products_{timestamp}.csv")

            # Process in batches using ThreadPoolExecutor
            results = []
            processed_count = 0

            with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
                # Submit all products for processing
                future_to_product = {
                    executor.submit(self.categorizer.categorize_product, row['name']): row['name']
                    for _, row in df.iterrows()
                }

                # Process results as they complete
                for future in concurrent.futures.as_completed(future_to_product):
                    product_name = future_to_product[future]
                    try:
                        category, subcategory, confidence = future.result()
                        results.append({
                            'name': product_name,
                            'category': category,
                            'subcategory': subcategory,
                            'confidence': confidence
                        })
                        processed_count += 1
                        self.update_progress((processed_count / total_rows) * 100)
                        self.update_status(f"Processed {processed_count}/{total_rows} products...")
                    except Exception as e:
                        print(f"Error processing {product_name}: {str(e)}")

            # Convert results to DataFrame and save
            results_df = pd.DataFrame(results)
            results_df.to_csv(output_file, index=False)

            # Export to MongoDB
            try:
                self.update_status("Exporting to MongoDB...")
                self.categorizer.export_to_mongodb(
                    results_df,
                    self.mongo_uri.get(),
                    "products_db",
                    "categorized_products"
                )
                self.update_status("Export to MongoDB complete!")
            except Exception as e:
                self.update_status(f"MongoDB export failed: {str(e)}")

            # Print summary
            summary = f"""
            Processing complete!
            Total products: {len(results_df)}
            Output saved to: {output_file}

            Category distribution:
            {results_df['category'].value_counts().to_string()}

            Average confidence: {results_df['confidence'].mean():.2f}
            """
            self.update_status(summary)

        except Exception as e:
            self.update_status(f"Error: {str(e)}")
        finally:
            self.processing = False
            self.process_button.state(['!disabled'])

    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    ui = ProductCategorizerUI()
    ui.run()
