const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;
    const { Provider, useSelector, useDispatch } = ReactRedux;
    const { createSlice, createAsyncThunk, configureStore } = RTK;

    // =========================================================================
    // ROBUST CLIENT HASH ROUTER ENGINE (Guarantees zero CDN mismatch errors)
    // =========================================================================
    const RouterContext = createContext({
      pathname: "/",
      params: {},
      navigate: () => {}
    });

    const HashRouter = ({ children }) => {
      const getHashPath = () => {
        const hash = window.location.hash.slice(1);
        if (!hash || hash === "") return "/";
        return hash.startsWith("/") ? hash : "/" + hash;
      };

      const [pathname, setPathname] = useState(getHashPath);

      useEffect(() => {
        const handleHashChange = () => {
          setPathname(getHashPath());
        };
        window.addEventListener("hashchange", handleHashChange);
        if (!window.location.hash) {
          window.location.hash = "#/";
        }
        return () => window.removeEventListener("hashchange", handleHashChange);
      }, []);

      const navigate = useCallback((to, options = {}) => {
        const targetPath = to.startsWith("/") ? to : "/" + to;
        if (options.replace) {
          const url = window.location.href.split("#")[0] + "#" + targetPath;
          window.location.replace(url);
        } else {
          window.location.hash = "#" + targetPath;
        }
      }, []);

      const value = useMemo(() => ({ pathname, navigate }), [pathname, navigate]);

      return (
        <RouterContext.Provider value={value}>
          {children}
        </RouterContext.Provider>
      );
    };

    const useNavigate = () => {
      const ctx = useContext(RouterContext);
      return ctx.navigate;
    };

    const useLocation = () => {
      const ctx = useContext(RouterContext);
      return { pathname: ctx.pathname };
    };

    const useParams = () => {
      const ctx = useContext(RouterContext);
      return ctx.params || {};
    };

    const Link = ({ to, className, children, onClick, ...rest }) => {
      const navigate = useNavigate();
      const handleClick = (e) => {
        e.preventDefault();
        if (onClick) onClick(e);
        navigate(to);
      };
      return (
        <a href={`#${to.startsWith("/") ? to : "/" + to}`} className={className} onClick={handleClick} {...rest}>
          {children}
        </a>
      );
    };

    const Navigate = ({ to, replace }) => {
      const navigate = useNavigate();
      useEffect(() => {
        navigate(to, { replace });
      }, [to, replace, navigate]);
      return null;
    };

    // Match route pattern e.g., "/destinations/:id" against "/destinations/dest-kashmir"
    function matchPathPattern(pattern, pathname) {
      if (pattern === "*") return { matches: true, params: {} };
      const patternParts = pattern.split("/").filter(Boolean);
      const pathParts = pathname.split("/").filter(Boolean);

      if (patternParts.length !== pathParts.length) return { matches: false, params: {} };

      const params = {};
      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(":")) {
          const paramName = patternParts[i].slice(1);
          params[paramName] = decodeURIComponent(pathParts[i]);
        } else if (patternParts[i] !== pathParts[i]) {
          return { matches: false, params: {} };
        }
      }
      return { matches: true, params };
    }

    const Route = ({ path, element }) => null; // Handled declaratively by Routes

    const Routes = ({ children }) => {
      const { pathname, navigate } = useContext(RouterContext);
      const childrenArray = React.Children.toArray(children);

      for (const child of childrenArray) {
        if (!child || !child.props) continue;
        const { path, element } = child.props;
        const { matches, params } = matchPathPattern(path, pathname);
        if (matches) {
          return (
            <RouterContext.Provider value={{ pathname, navigate, params }}>
              {element}
            </RouterContext.Provider>
          );
        }
      }
      return null;
    };

    // =========================================================================
    // CUSTOM HOOK: useDebounce [Lectures 31-36]
    // =========================================================================
    function useDebounce(value, delay = 350) {
      const [debouncedValue, setDebouncedValue] = useState(value);
      useEffect(() => {
        const handler = setTimeout(() => {
          setDebouncedValue(value);
        }, delay);
        return () => {
          clearTimeout(handler);
        };
      }, [value, delay]);
      return debouncedValue;
    }

    // App Navigation Pages Definition
    const APP_NAV_ITEMS = [
      { path: "/", id: "planner", label: "Planner", icon: "fa-calculator" },
      { path: "/split-bill", id: "split", label: "Split Bill", icon: "fa-hand-holding-dollar" },
      { path: "/destinations", id: "destinations", label: "Destinations", icon: "fa-compass" },
      { path: "/itinerary", id: "itinerary", label: "Itinerary & Weather", icon: "fa-calendar-days" },
      { path: "/checklist", id: "checklist", label: "Checklist", icon: "fa-list-check" }
    ];

    // =========================================================================
    // MULTI-CURRENCY CONVERSION SYSTEM (USD Baseline)
    // =========================================================================
    const CURRENCY_RATES = {
      INR: { symbol: "₹", rate: 86.5, label: "INR (₹) Indian Rupee" },
      USD: { symbol: "$", rate: 1.0, label: "USD ($) US Dollar" },
      EUR: { symbol: "€", rate: 0.92, label: "EUR (€) Euro" },
      GBP: { symbol: "£", rate: 0.78, label: "GBP (£) British Pound" }
    };

    const formatCurr = (usdAmount, currCode = "INR") => {
      const cfg = CURRENCY_RATES[currCode] || CURRENCY_RATES.INR;
      const converted = (Number(usdAmount) || 0) * cfg.rate;
      return new Intl.NumberFormat(currCode === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency: currCode,
        maximumFractionDigits: 0
      }).format(converted);
    };

    // =========================================================================
    // DEFAULT DATA & PRESETS
    // =========================================================================
    const PRESETS = {
      beach: {
        tripName: "Sunny Goa Beach Getaway",
        destination: "Goa, India",
        adults: 2,
        children: 2,
        days: 5,
        availableBudget: 2500,
        transportType: "flight",
        hotelCategory: "midrange",
        foodDailyPerPerson: 25,
        sightseeing: 350,
        shopping: 250,
        emergency: 200
      },
      kashmir: {
        tripName: "Kashmir Heavenly Valley",
        destination: "Srinagar & Gulmarg, Kashmir",
        adults: 2,
        children: 2,
        days: 6,
        availableBudget: 2800,
        transportType: "flight",
        hotelCategory: "luxury",
        foodDailyPerPerson: 30,
        sightseeing: 450,
        shopping: 350,
        emergency: 250
      },
      mountain: {
        tripName: "Manali Alpine Escape",
        destination: "Manali, Himachal Pradesh",
        adults: 2,
        children: 1,
        days: 7,
        availableBudget: 3200,
        transportType: "car",
        hotelCategory: "luxury",
        foodDailyPerPerson: 35,
        sightseeing: 500,
        shopping: 400,
        emergency: 300
      },
      ladakh: {
        tripName: "Ladakh High Altitude Odyssey",
        destination: "Leh Ladakh, India",
        adults: 2,
        children: 0,
        days: 7,
        availableBudget: 3000,
        transportType: "flight",
        hotelCategory: "midrange",
        foodDailyPerPerson: 28,
        sightseeing: 550,
        shopping: 200,
        emergency: 350
      },
      roadtrip: {
        tripName: "Coastal Road Trip",
        destination: "Pondicherry & Mahabalipuram",
        adults: 4,
        children: 0,
        days: 4,
        availableBudget: 1200,
        transportType: "car",
        hotelCategory: "budget",
        foodDailyPerPerson: 18,
        sightseeing: 180,
        shopping: 150,
        emergency: 120
      },
      dubai: {
        tripName: "Futuristic Dubai Family Safari",
        destination: "Dubai, UAE",
        adults: 2,
        children: 2,
        days: 5,
        availableBudget: 4200,
        transportType: "flight",
        hotelCategory: "luxury",
        foodDailyPerPerson: 50,
        sightseeing: 700,
        shopping: 500,
        emergency: 400
      },
      bali: {
        tripName: "Tropical Bali Paradise",
        destination: "Bali, Indonesia",
        adults: 2,
        children: 1,
        days: 6,
        availableBudget: 3600,
        transportType: "flight",
        hotelCategory: "midrange",
        foodDailyPerPerson: 32,
        sightseeing: 600,
        shopping: 400,
        emergency: 300
      },
      switzerland: {
        tripName: "Swiss Alps & Interlaken Dream",
        destination: "Interlaken, Switzerland",
        adults: 2,
        children: 1,
        days: 6,
        availableBudget: 6000,
        transportType: "flight",
        hotelCategory: "luxury",
        foodDailyPerPerson: 70,
        sightseeing: 900,
        shopping: 500,
        emergency: 600
      },
      luxury: {
        tripName: "Maldives Paradise Resort",
        destination: "Male, Maldives",
        adults: 2,
        children: 0,
        days: 6,
        availableBudget: 5500,
        transportType: "flight",
        hotelCategory: "resort",
        foodDailyPerPerson: 60,
        sightseeing: 850,
        shopping: 600,
        emergency: 500
      }
    };

    const HOTEL_RATES_PER_NIGHT = {
      budget: 50,
      midrange: 120,
      luxury: 250,
      resort: 450
    };

    const TRANSPORT_BASE_COSTS = {
      car: { base: 60, perDayRate: 40, label: "Self Drive / Rental Car" },
      bus: { base: 25, perPersonRate: 35, label: "Intercity Bus / Express" },
      train: { base: 40, perPersonRate: 50, label: "Express Train (AC Class)" },
      flight: { base: 180, perPersonRate: 220, label: "Roundtrip Domestic Flights" }
    };

    const INITIAL_DESTINATIONS = [
      {
        id: "dest-kashmir",
        name: "Kashmir - Srinagar & Gulmarg",
        country: "India",
        category: "Mountain",
        badge: "Heaven on Earth",
        tagline: "Snow-clad peaks, Dal Lake shikara rides, and the world's highest Gondola cable car.",
        avgCostPerPersonPerDay: 70,
        rating: 4.9,
        image: "kashmir.jpg",
        highlights: ["Gulmarg Gondola Ride", "Dal Lake Houseboat", "Pahalgam Valley & Betaab"],
        description: "Experience the Switzerland of Asia with world-famous Kashmiri cuisine, gentle shikara rides along Dal Lake, and snow-filled pine woods of Gulmarg.",
        visaReq: "Domestic Indian Travel Permit (No Visa Required for Citizens)"
      },
      {
        id: "dest-shimla",
        name: "Shimla & Kufri Hill Station",
        country: "India",
        category: "Mountain",
        badge: "Himachal Queen of Hills",
        tagline: "Colonial Mall Road, historic Kalka-Shimla Toy Train, and snowy slopes of Kufri.",
        avgCostPerPersonPerDay: 55,
        rating: 4.8,
        image: "shimla.jpg",
        highlights: ["Historic Ridge & Mall Road", "Kufri Snow Adventure Park", "Jakhu Temple Ropeway"],
        description: "Pine-covered mountain ridgelines, colonial architecture, horse rides in Kufri, and scenic Himalayan valley viewpoints.",
        visaReq: "Domestic Travel (Valid Govt Photo ID / Aadhaar Required)"
      },
      {
        id: "dest-dharamshala",
        name: "Dharamshala & McLeodGanj",
        country: "India",
        category: "Mountain",
        badge: "Himachal Peace Haven",
        tagline: "Tibetan culture, Dalai Lama Monastery, Triund snowline trek, and Bhagsu waterfalls.",
        avgCostPerPersonPerDay: 50,
        rating: 4.8,
        image: "dharamshala.jpg",
        highlights: ["Tsuglagkhang Dalai Lama Temple", "Triund Day Trek", "Bhagsunag Waterfall"],
        description: "A serene hill retreat blending Tibetan Buddhist monasteries, mountain cafes, cedar forests, and breathtaking Dhauladhar peaks.",
        visaReq: "Domestic Travel (Valid Govt Photo ID)"
      },
      {
        id: "dest-spiti",
        name: "Spiti Valley & Kaza",
        country: "India",
        category: "Mountain",
        badge: "Himachal Cold Desert",
        tagline: "World's highest post office at Hikkim, Key Monastery, and turquoise Chandratal Lake.",
        avgCostPerPersonPerDay: 65,
        rating: 4.9,
        image: "spiti.jpg",
        highlights: ["Key Gompa Fortress", "Highest Post Office Hikkim", "Chandratal Lake Camping"],
        description: "The rugged middle land between Tibet and India, offering barren high-altitude desert landscapes, fossil villages, and ancient monasteries.",
        visaReq: "Inner Line Permit required for foreign nationals; Indian ID for citizens"
      },
      {
        id: "dest-jaipur",
        name: "Jaipur Pink City",
        country: "India",
        category: "Cultural",
        badge: "Royal Rajasthan",
        tagline: "Majestic Amer Fort, Hawa Mahal palace of winds, royal havelis, and vibrant bazaars.",
        avgCostPerPersonPerDay: 58,
        rating: 4.8,
        image: "jaipur.jpg",
        highlights: ["Amer Fort Light & Sound Show", "Hawa Mahal & City Palace", "Chokhi Dhani Cultural Village"],
        description: "Immerse your family in royal Rajputana heritage, elephant sanctuary tours, puppet shows, and lip-smacking Dal Baati Churma.",
        visaReq: "Domestic Travel (Valid Govt Photo ID)"
      },
      {
        id: "dest-haridwar",
        name: "Haridwar & Holy Ganga",
        country: "India",
        category: "Nature",
        badge: "Spiritual Heritage",
        tagline: "Sacred Har Ki Pauri evening Ganga Aarti, sacred ghats, and Mansa Devi ropeway.",
        avgCostPerPersonPerDay: 40,
        rating: 4.8,
        image: "haridwar.jpg",
        highlights: ["Har Ki Pauri Evening Aarti", "Mansa Devi & Chandi Devi Cable Car", "Bada Bazaar Local Sweets"],
        description: "One of India's most ancient sacred cities, featuring thousands of glowing earthen lamps floating down the sacred Ganges at sunset.",
        visaReq: "Domestic Travel (Valid Govt Photo ID)"
      },
      {
        id: "dest-vaishnodevi",
        name: "Jammu & Vaishno Devi Katra",
        country: "India",
        category: "Cultural",
        badge: "Jammu Spiritual Gateway",
        tagline: "Holy Trikuta Mountain cave shrine, Katra helicopter rides, and Patnitop pine meadows.",
        avgCostPerPersonPerDay: 52,
        rating: 4.9,
        image: "jammu.jpg",
        highlights: ["Mata Vaishno Devi Shrine Yatra", "Battery Car / Helicopter Ride", "Patnitop Meadows & Ropeway"],
        description: "A deeply revered pilgrimage and scenic getaway in Jammu offering blessed family journeys, lush pine hill stations, and panoramic views.",
        visaReq: "RFID Yatra Registration Card (Issued at Katra)"
      },
      {
        id: "dest-australia",
        name: "Sydney & Great Barrier Reef, Australia",
        country: "Australia",
        category: "Luxury",
        badge: "International Wonder",
        tagline: "Sydney Opera House, Bondi Beach surfing, and Great Barrier Reef coral diving.",
        avgCostPerPersonPerDay: 175,
        rating: 4.9,
        image: "Sydney aus.jpg",
        highlights: ["Sydney Opera House & Harbour Bridge", "Bondi Coastal Walk", "Cairns Great Barrier Reef Catamaran"],
        description: "World-class modern architecture, wildlife parks with koalas and kangaroos, sun-kissed beaches, and kaleidoscopic underwater coral ecosystems.",
        visaReq: "Australian eVisitor / Subclass 600 Tourist Visa Required"
      },
      {
        id: "dest-usa",
        name: "New York City & Manhattan, USA",
        country: "USA",
        category: "Luxury",
        badge: "The Big Apple",
        tagline: "Times Square neon lights, Central Park strolls, Statue of Liberty, and Broadway shows.",
        avgCostPerPersonPerDay: 190,
        rating: 4.9,
        image: "usa.jpg",
        highlights: ["Times Square & Broadway Theatre", "Statue of Liberty Ferry Cruise", "Central Park & Summit One Vanderbilt"],
        description: "The city that never sleeps, offering world-famous skyline observation decks, family museum complexes, and vibrant multicultural food scenes.",
        visaReq: "US B1/B2 Tourist Visa / ESTA Authorization Required"
      },
      {
        id: "dest-ladakh",
        name: "Leh Ladakh Trans-Himalaya",
        country: "India",
        category: "Mountain",
        badge: "Adventure & Monasteries",
        tagline: "Azure Pangong Lake, double-humped camel safari in Nubra, and Khardung La pass.",
        avgCostPerPersonPerDay: 80,
        rating: 4.9,
        image: "leh ladakh.jpg",
        highlights: ["Pangong Tso Crystal Blue", "Nubra Sand Dunes", "Hemis & Thiksey Gompas"],
        description: "The land of high passes, ancient Tibetan Buddhist monasteries, and crystal-clear high altitude lakes under milky-way starry skies.",
        visaReq: "Ladakh Autonomous Hill Development Council Eco-Fee & Protected Area Permit"
      },
      {
        id: "dest-andaman",
        name: "Andaman & Nicobar Islands",
        country: "India",
        category: "Beach",
        badge: "Turquoise Waters",
        tagline: "Asia's best Radhanagar beach, live coral reef scuba diving, and Cellular Jail light show.",
        avgCostPerPersonPerDay: 85,
        rating: 4.9,
        image: "andaman nicobar.jpg",
        highlights: ["Havelock & Neil Island", "Scuba Diving & Sea Walking", "Radhanagar Sunset"],
        description: "Tropical island paradise with powdery white sand beaches, untouched marine biodiversity, and historic maritime heritage.",
        visaReq: "Domestic Indian Travel (No Restricted Area Permit needed for major islands)"
      },
      {
        id: "dest-bali",
        name: "Bali Tropical Paradise",
        country: "Indonesia",
        category: "Beach",
        badge: "Exotic Island",
        tagline: "Emerald rice terraces in Ubud, clifftop sea temples, waterfalls, and family surf beaches.",
        avgCostPerPersonPerDay: 75,
        rating: 4.8,
        image: "bali.jpg",
        highlights: ["Tegallalang Rice Terraces", "Tanah Lot Clifftop Temple", "Nusa Penida Day Trip"],
        description: "Rich cultural sanctuaries, monkey forests, vibrant sunset beach clubs, and serene spa villas nested in lush green jungles.",
        visaReq: "Indonesia Electronic Visa on Arrival (e-VoA, 30 Days)"
      },
      {
        id: "dest-dubai",
        name: "Dubai Modern Oasis",
        country: "UAE",
        category: "Luxury",
        badge: "Futuristic Wonder",
        tagline: "Burj Khalifa sky deck, exhilarating 4x4 dune bashing, and world's biggest indoor aquariums.",
        avgCostPerPersonPerDay: 130,
        rating: 4.9,
        image: "dubai.jpg",
        highlights: ["Burj Khalifa 124th Level", "Desert Dune Safari BBQ", "Dubai Mall & Fountain Show"],
        description: "Futuristic architecture, extravagant shopping malls, thrilling theme parks, and golden desert dinner safaris under starlit tents.",
        visaReq: "UAE Tourist Visa (30/60 Days e-Visa)"
      },
      {
        id: "dest-swiss",
        name: "Switzerland & Interlaken",
        country: "Switzerland",
        category: "Luxury",
        badge: "Alpine Magic",
        tagline: "Jungfraujoch 'Top of Europe' cogwheel train, mirror lakes, and Heidi alpine meadows.",
        avgCostPerPersonPerDay: 160,
        rating: 5.0,
        image: "switzerland.jpg",
        highlights: ["Jungfraujoch Glacier Train", "Lake Brienz Steamboat", "Lauterbrunnen 72 Waterfalls"],
        description: "Postcard-perfect snow-capped mountains, crystal clear turquoise lakes, world-class chocolates, and vintage scenic trains.",
        visaReq: "Schengen Visa (Type C Short Stay)"
      },
      {
        id: "dest-singapore",
        name: "Singapore Garden City",
        country: "Singapore",
        category: "Cultural",
        badge: "Modern Family Hub",
        tagline: "Supertrees at Gardens by the Bay, Sentosa Island waterparks, and night wildlife safari.",
        avgCostPerPersonPerDay: 120,
        rating: 4.8,
        image: "singapore.jpg",
        highlights: ["Gardens by the Bay Avatar Trees", "Universal Studios Sentosa", "Marina Bay Infinity Views"],
        description: "A futuristic metropolis in nature with family waterparks, Michelin star street food, and vibrant botanical glasshouses.",
        visaReq: "Singapore e-Visa via authorized agency & SG Arrival Card"
      },
      {
        id: "dest-1",
        name: "Goa Beach Coast",
        country: "India",
        category: "Beach",
        badge: "Popular Beach",
        tagline: "Golden beaches, water sports, and vibrant night markets for the family.",
        avgCostPerPersonPerDay: 75,
        rating: 4.8,
        image: "goa.jpg",
        highlights: ["Baga & Calangute Beaches", "Dudhsagar Waterfalls", "Sunset River Cruise"],
        description: "Portuguese colonial churches, mouth-watering seafood shacks, parasailing, and family cruises on Mandovi river.",
        visaReq: "Domestic Indian Travel (No Visa Required)"
      }
    ];

    const DEFAULT_CHECKLIST = [
      { id: "chk-1", category: "Documents & Cards", text: "Government Photo IDs / Aadhaar / Passports for all family members", done: true },
      { id: "chk-2", category: "Documents & Cards", text: "Flight / Train tickets & Hotel booking vouchers saved offline", done: true },
      { id: "chk-3", category: "Documents & Cards", text: "Travel insurance copy & Emergency family doctor card", done: false },
      { id: "chk-4", category: "Documents & Cards", text: "UPI apps, Credit cards, Debit cards & Cash in small currency notes", done: true },
      { id: "chk-5", category: "Apparel & Footwear", text: "Weather-appropriate outfits (3-5 extra pairs for kids)", done: false },
      { id: "chk-6", category: "Apparel & Footwear", text: "Comfortable sneakers / walking shoes & extra pairs of socks", done: false },
      { id: "chk-7", category: "Apparel & Footwear", text: "Swimwear, beach towels, sun caps, and UV protection sunglasses", done: false },
      { id: "chk-8", category: "Health & First Aid", text: "Personal prescription medications for the whole travel duration", done: false },
      { id: "chk-9", category: "Health & First Aid", text: "First Aid Kit (band-aids, antiseptic spray, motion sickness tablets)", done: false },
      { id: "chk-10", category: "Health & First Aid", text: "SPF 50+ Sunscreen, Mosquito / bug repellent & Hand sanitizer", done: false },
      { id: "chk-11", category: "Electronics & Tech", text: "Smartphones & multi-port fast chargers with Type-C cables", done: false },
      { id: "chk-12", category: "Electronics & Tech", text: "20,000 mAh Heavy Duty Power Bank", done: false }
    ];

    const INITIAL_ITINERARY = [
      { day: 1, title: "Arrival, Check-in & Scenic Sunset", activity: "Reach destination, hotel check-in, rest, evening promenade walk and welcoming family dinner.", weather: { temp: "29°C", icon: "fa-sun", cond: "Clear & Sunny" } },
      { day: 2, title: "Heritage, Monuments & Local Flavors", activity: "Visit iconic monuments, historic spots, guided audio tour, and authentic regional family lunch.", weather: { temp: "28°C", icon: "fa-cloud-sun", cond: "Partly Cloudy" } },
      { day: 3, title: "Adventure, Safari & Outdoor Excursion", activity: "Morning boat cruise / safari, cable car ride, water sports or nature pine trek with kids.", weather: { temp: "27°C", icon: "fa-cloud-sun", cond: "Breezy & Pleasant" } },
      { day: 4, title: "Local Bazaars & Souvenir Shopping", activity: "Bustling flea markets, artisan handicrafts, street food testing, and golden hour photo session.", weather: { temp: "30°C", icon: "fa-sun", cond: "Warm & Bright" } },
      { day: 5, title: "Leisure Brunch, Packing & Departure", activity: "Leisure morning pool session, hearty family brunch, packing, checkout, and journey back home.", weather: { temp: "28°C", icon: "fa-wind", cond: "Mild & Gentle" } }
    ];

    // =========================================================================
    // REDUX TOOLKIT ASYNC THUNKS [Lectures 67-72: REST APIs, Async State]
    // =========================================================================

    // 1. Live Weather REST API Thunk (Open-Meteo Public API)
    const fetchLiveWeather = createAsyncThunk(
      "weather/fetchLiveWeather",
      async (cityName, { rejectWithValue }) => {
        try {
          // Geocoding query
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
          const geoData = await geoRes.json();
          if (!geoData.results || geoData.results.length === 0) {
            throw new Error(`Location coordinates for '${cityName}' not found.`);
          }
          const { latitude, longitude, name, country } = geoData.results[0];

          // Weather query
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
          const weatherData = await weatherRes.json();

          return {
            city: name,
            country: country || "",
            currentTemp: Math.round(weatherData.current.temperature_2m),
            humidity: weatherData.current.relative_humidity_2m,
            windSpeed: weatherData.current.wind_speed_10m,
            weatherCode: weatherData.current.weather_code,
            fetchedAt: new Date().toLocaleTimeString()
          };
        } catch (err) {
          return rejectWithValue(err.message || "Failed to fetch live weather forecast.");
        }
      }
    );

    // =========================================================================
    // REDUX TOOLKIT SLICES
    // =========================================================================

    // Auth Slice
    const initialUser = localStorage.getItem("gopocketUser") || sessionStorage.getItem("gopocketUser") || null;
    const authSlice = createSlice({
      name: "auth",
      initialState: {
        user: initialUser,
        isAuthenticated: !!initialUser
      },
      reducers: {
        login: (state, action) => {
          const { user, remember } = action.payload;
          state.user = user;
          state.isAuthenticated = true;
          if (remember) {
            localStorage.setItem("gopocketUser", user);
          } else {
            sessionStorage.setItem("gopocketUser", user);
          }
        },
        logout: (state) => {
          state.user = null;
          state.isAuthenticated = false;
          localStorage.removeItem("gopocketUser");
          sessionStorage.removeItem("gopocketUser");
        }
      }
    });

    // UI Modal Slice (Receipt, Boarding Pass & Visa)
    const uiSlice = createSlice({
      name: "ui",
      initialState: {
        isReceiptModalOpen: false
      },
      reducers: {
        openReceiptModal: (state) => { state.isReceiptModalOpen = true; },
        closeReceiptModal: (state) => { state.isReceiptModalOpen = false; }
      }
    });

    // Toast Notifications Slice
    const toastSlice = createSlice({
      name: "toast",
      initialState: {
        toasts: []
      },
      reducers: {
        addToast: (state, action) => {
          state.toasts.push({
            id: Date.now() + Math.random(),
            type: action.payload.type || "info",
            text: action.payload.text
          });
        },
        removeToast: (state, action) => {
          state.toasts = state.toasts.filter(t => t.id !== action.payload);
        }
      }
    });

    // Currency Slice
    const currencySlice = createSlice({
      name: "currency",
      initialState: {
        selected: "INR"
      },
      reducers: {
        setCurrency: (state, action) => {
          state.selected = action.payload;
        }
      }
    });

    // Custom Expenses Slice
    const customExpenseSlice = createSlice({
      name: "customExpenses",
      initialState: {
        items: [
          { id: "ce-1", name: "Visa & Entry Permits", costUSD: 80, icon: "fa-passport" },
          { id: "ce-2", name: "Family Photography Session", costUSD: 60, icon: "fa-camera" }
        ]
      },
      reducers: {
        addCustomExpense: (state, action) => {
          state.items.push(action.payload);
        },
        removeCustomExpense: (state, action) => {
          state.items = state.items.filter((i) => i.id !== action.payload);
        }
      }
    });

    // Budget Slice
    const budgetSlice = createSlice({
      name: "budget",
      initialState: {
        ...PRESETS.beach,
        activePreset: "beach"
      },
      reducers: {
        updateField: (state, action) => {
          const { field, value } = action.payload;
          state[field] = value;
        },
        loadPreset: (state, action) => {
          const presetKey = action.payload;
          if (PRESETS[presetKey]) {
            return {
              ...PRESETS[presetKey],
              activePreset: presetKey
            };
          }
        },
        resetBudget: () => ({
          ...PRESETS.beach,
          activePreset: "beach"
        })
      }
    });

    // Destinations Slice
    const savedCustomDests = JSON.parse(localStorage.getItem("gopocket_custom_dests")) || [];
    const destinationsSlice = createSlice({
      name: "destinations",
      initialState: {
        list: [...INITIAL_DESTINATIONS, ...savedCustomDests],
        filter: "all",
        searchQuery: "",
        sortBy: "featured", // 'featured' | 'price-asc' | 'price-desc' | 'rating'
        currentPage: 1,
        itemsPerPage: 6
      },
      reducers: {
        addDestination: (state, action) => {
          state.list.unshift(action.payload);
          const customOnly = state.list.filter((d) => d.id.startsWith("dest-custom-"));
          localStorage.setItem("gopocket_custom_dests", JSON.stringify(customOnly));
        },
        setFilter: (state, action) => {
          state.filter = action.payload;
          state.currentPage = 1;
        },
        setSearchQuery: (state, action) => {
          state.searchQuery = action.payload;
          state.currentPage = 1;
        },
        setSortBy: (state, action) => {
          state.sortBy = action.payload;
        },
        setCurrentPage: (state, action) => {
          state.currentPage = action.payload;
        }
      }
    });

    // Checklist Slice
    const savedChecklist = JSON.parse(localStorage.getItem("voyage_smart_checklist"));
    const checklistSlice = createSlice({
      name: "checklist",
      initialState: {
        items: savedChecklist && savedChecklist.length > 0 ? savedChecklist : DEFAULT_CHECKLIST
      },
      reducers: {
        toggleItem: (state, action) => {
          const item = state.items.find((i) => i.id === action.payload);
          if (item) {
            item.done = !item.done;
            localStorage.setItem("voyage_smart_checklist", JSON.stringify(state.items));
          }
        },
        addItem: (state, action) => {
          state.items.push({
            id: `chk-custom-${Date.now()}`,
            category: "Custom Essentials",
            text: action.payload,
            done: false
          });
          localStorage.setItem("voyage_smart_checklist", JSON.stringify(state.items));
        },
        deleteItem: (state, action) => {
          state.items = state.items.filter((i) => i.id !== action.payload);
          localStorage.setItem("voyage_smart_checklist", JSON.stringify(state.items));
        }
      }
    });

    // Itinerary Slice
    const itinerarySlice = createSlice({
      name: "itinerary",
      initialState: {
        daysPlan: INITIAL_ITINERARY
      },
      reducers: {
        updateDayPlan: (state, action) => {
          const { day, title, activity } = action.payload;
          const found = state.daysPlan.find((d) => d.day === day);
          if (found) {
            found.title = title;
            found.activity = activity;
          }
        }
      }
    });

    // Weather Slice with Async Thunk Status Lifecycles
    const weatherSlice = createSlice({
      name: "weather",
      initialState: {
        data: null,
        status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
        error: null
      },
      reducers: {
        clearWeather: (state) => {
          state.data = null;
          state.status = "idle";
          state.error = null;
        }
      },
      extraReducers: (builder) => {
        builder
          .addCase(fetchLiveWeather.pending, (state) => {
            state.status = "loading";
            state.error = null;
          })
          .addCase(fetchLiveWeather.fulfilled, (state, action) => {
            state.status = "succeeded";
            state.data = action.payload;
            state.error = null;
          })
          .addCase(fetchLiveWeather.rejected, (state, action) => {
            state.status = "failed";
            state.error = action.payload || "Could not retrieve live forecast.";
          });
      }
    });

    const store = configureStore({
      reducer: {
        auth: authSlice.reducer,
        ui: uiSlice.reducer,
        toast: toastSlice.reducer,
        currency: currencySlice.reducer,
        budget: budgetSlice.reducer,
        customExpenses: customExpenseSlice.reducer,
        destinations: destinationsSlice.reducer,
        checklist: checklistSlice.reducer,
        itinerary: itinerarySlice.reducer,
        weather: weatherSlice.reducer
      }
    });

    // =========================================================================
    // COMPUTED FINANCIAL SELECTOR
    // =========================================================================
    function calculateTransportCost(type, totalPeople, days) {
      switch (type) {
        case "car":
          return TRANSPORT_BASE_COSTS.car.base + (TRANSPORT_BASE_COSTS.car.perDayRate * days);
        case "bus":
          return TRANSPORT_BASE_COSTS.bus.perPersonRate * totalPeople;
        case "train":
          return TRANSPORT_BASE_COSTS.train.perPersonRate * totalPeople;
        case "flight":
          return TRANSPORT_BASE_COSTS.flight.perPersonRate * totalPeople;
        default:
          return 0;
      }
    }

    const selectBudgetMetrics = (state) => {
      const b = state.budget;
      const totalPeople = (Number(b.adults) || 1) + (Number(b.children) || 0);
      const days = Number(b.days) || 1;
      const availableBudget = Number(b.availableBudget) || 0;

      const transportTotal = calculateTransportCost(b.transportType, totalPeople, days);
      const accommodationTotal = (HOTEL_RATES_PER_NIGHT[b.hotelCategory] || 120) * days;
      const foodTotal = (Number(b.foodDailyPerPerson) || 0) * totalPeople * days;
      const sightseeingTotal = Number(b.sightseeing) || 0;
      const shoppingTotal = Number(b.shopping) || 0;
      const emergencyTotal = Number(b.emergency) || 0;

      const customExpensesTotal = state.customExpenses.items.reduce((sum, item) => sum + (Number(item.costUSD) || 0), 0);

      const totalCost = transportTotal + accommodationTotal + foodTotal + sightseeingTotal + shoppingTotal + emergencyTotal + customExpensesTotal;
      const costPerPerson = totalPeople > 0 ? totalCost / totalPeople : totalCost;
      const balance = availableBudget - totalCost;
      const percentUsed = availableBudget > 0 ? Math.min(Math.round((totalCost / availableBudget) * 100), 200) : 100;

      const transportComparisons = {
        car: calculateTransportCost("car", totalPeople, days),
        bus: calculateTransportCost("bus", totalPeople, days),
        train: calculateTransportCost("train", totalPeople, days),
        flight: calculateTransportCost("flight", totalPeople, days)
      };

      const adultsCount = Number(b.adults) || 1;
      const kidsCount = Number(b.children) || 0;
      const totalWeightedPersons = adultsCount + (kidsCount * 0.6);
      const adultShare = totalWeightedPersons > 0 ? (totalCost / totalWeightedPersons) : totalCost;
      const childShare = adultShare * 0.6;
      const roomsRequired = Math.ceil(totalPeople / 2);
      const costPerRoom = roomsRequired > 0 ? totalCost / roomsRequired : totalCost;
      const costPerDay = days > 0 ? totalCost / days : totalCost;

      return {
        totalPeople,
        adultsCount,
        kidsCount,
        days,
        availableBudget,
        transportTotal,
        accommodationTotal,
        foodTotal,
        sightseeingTotal,
        shoppingTotal,
        emergencyTotal,
        customExpensesTotal,
        totalCost,
        costPerPerson,
        balance,
        percentUsed,
        transportComparisons,
        adultShare,
        childShare,
        roomsRequired,
        costPerRoom,
        costPerDay
      };
    };

    // =========================================================================
    // EXPORT UTILITY
    // =========================================================================
    const exportToCSV = (budget, metrics, customExpenses, currency) => {
      const cfg = CURRENCY_RATES[currency] || CURRENCY_RATES.INR;
      const rate = cfg.rate;

      const rows = [
        ["GoPocket Family Travel Budget Planner - Summary Report"],
        ["Generated on", new Date().toLocaleDateString()],
        ["Trip Title", budget.tripName],
        ["Destination", budget.destination],
        ["Total Duration", `${budget.days} Days`],
        ["Family Travelers", `${budget.adults} Adults, ${budget.children} Kids (Total ${metrics.totalPeople})`],
        ["Currency", `${currency} (${cfg.symbol})`],
        [""],
        ["Expense Category", `Cost in ${currency}`],
        ["Transportation Mode", (metrics.transportTotal * rate).toFixed(2)],
        ["Accommodation & Hotel", (metrics.accommodationTotal * rate).toFixed(2)],
        ["Food & Daily Meals", (metrics.foodTotal * rate).toFixed(2)],
        ["Sightseeing & Activities", (metrics.sightseeingTotal * rate).toFixed(2)],
        ["Shopping & Souvenirs", (metrics.shoppingTotal * rate).toFixed(2)],
        ["Emergency & Contingency", (metrics.emergencyTotal * rate).toFixed(2)]
      ];

      customExpenses.forEach((item) => {
        rows.push([`Custom: ${item.name}`, (item.costUSD * rate).toFixed(2)]);
      });

      rows.push([""]);
      rows.push(["TOTAL ESTIMATED COST", (metrics.totalCost * rate).toFixed(2)]);
      rows.push(["TOTAL BUDGET AVAILABLE", (metrics.availableBudget * rate).toFixed(2)]);
      rows.push(["REMAINING CUSHION / DEFICIT", (metrics.balance * rate).toFixed(2)]);
      rows.push(["COST PER PERSON", (metrics.costPerPerson * rate).toFixed(2)]);
      rows.push(["COST PER DAY", (metrics.costPerDay * rate).toFixed(2)]);

      const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${budget.tripName.replace(/\s+/g, "_")}_Budget_Report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // =========================================================================
    // TOURIST BOARDING PASS, VISA STATUS & RECEIPT MODAL COMPONENT
    // =========================================================================
    const TouristReceiptModal = () => {
      const dispatch = useDispatch();
      const isOpen = useSelector((state) => state.ui.isReceiptModalOpen);
      const budget = useSelector((state) => state.budget);
      const currency = useSelector((state) => state.currency.selected);
      const customExpenses = useSelector((state) => state.customExpenses.items);
      const destinations = useSelector((state) => state.destinations.list);
      const user = useSelector((state) => state.auth.user) || "Valued Family Traveler";
      const metrics = useSelector(selectBudgetMetrics);

      if (!isOpen) return null;

      const currentDest = destinations.find(d => budget.destination.toLowerCase().includes(d.name.toLowerCase().split(" ")[0])) || destinations[0];
      const pnrNumber = `GP-${Math.floor(100000 + Math.random() * 900000)}`;
      const flightNumber = budget.transportType === "flight" ? "AI-842 / EK-501" : budget.transportType === "train" ? "VANDE-BHARAT-22436" : "CAR-RENT-909";

      return (
        <div className="receipt-modal-backdrop" onClick={() => dispatch(uiSlice.actions.closeReceiptModal())}>
          <div className="receipt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <i className="fa-solid fa-passport" style={{ color: "var(--blue-cyan)", fontSize: "1.4rem" }}></i>
                <h2 style={{ fontSize: "1.3rem", color: "#fff" }}>Official Tourist Pass & Booking Receipt</h2>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => dispatch(uiSlice.actions.closeReceiptModal())}
                style={{ borderRadius: "50%", width: "32px", height: "32px", padding: 0 }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Boarding Pass Ticket View */}
            <div className="boarding-pass-wrap">
              <div className="boarding-pass-header">
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--blue-cyan)", fontWeight: 800, textTransform: "uppercase" }}>
                    <i className="fa-solid fa-ticket"></i> OFFICIAL TRAVEL E-TICKET & BOARDING PASS
                  </span>
                  <h3 style={{ fontSize: "1.25rem", color: "#fff", marginTop: "2px" }}>{budget.tripName}</h3>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="visa-stamp-tag">
                    <i className="fa-solid fa-stamp"></i> VISA: APPROVED
                  </span>
                </div>
              </div>

              <div className="boarding-pass-grid">
                <div className="boarding-pass-field">
                  <label>PASSENGER NAME</label>
                  <span>{user}</span>
                </div>
                <div className="boarding-pass-field">
                  <label>DESTINATION</label>
                  <span>{budget.destination}</span>
                </div>
                <div className="boarding-pass-field">
                  <label>PNR / BOOKING REF</label>
                  <span style={{ color: "var(--pink-light)", letterSpacing: "0.05em" }}>{pnrNumber}</span>
                </div>
                <div className="boarding-pass-field">
                  <label>TRANSPORT MODE</label>
                  <span>{budget.transportType.toUpperCase()} ({flightNumber})</span>
                </div>
                <div className="boarding-pass-field">
                  <label>TRAVELERS</label>
                  <span>{budget.adults} Adults, {budget.children} Kids</span>
                </div>
                <div className="boarding-pass-field">
                  <label>TRIP DURATION</label>
                  <span>{budget.days} Days / {budget.days - 1} Nights</span>
                </div>
              </div>

              <div style={{ background: "rgba(0,0,0,0.3)", padding: "0.8rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--blue-cyan)", fontWeight: 700 }}>
                    <i className="fa-solid fa-file-shield"></i> VISA & ENTRY GUIDELINE:
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {currentDest.visaReq || "Standard tourist entry documents verified. Carry original passports / photo ID."}
                  </p>
                </div>
                <i className="fa-solid fa-barcode" style={{ fontSize: "2rem", color: "var(--text-dim)", marginLeft: "1rem" }}></i>
              </div>
            </div>

            {/* Itemized Financial Receipt */}
            <h4 style={{ fontSize: "0.95rem", color: "var(--pink-light)", marginBottom: "0.5rem" }}>
              <i className="fa-solid fa-receipt"></i> Official Itemized Payment Breakdown
            </h4>

            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity / Detail</th>
                  <th style={{ textAlign: "right" }}>Total ({currency})</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Transportation ({budget.transportType.toUpperCase()})</td>
                  <td>{metrics.totalPeople} Travelers, {budget.days} Days</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{formatCurr(metrics.transportTotal, currency)}</td>
                </tr>
                <tr>
                  <td>Accommodation ({budget.hotelCategory.toUpperCase()})</td>
                  <td>{budget.days} Nights Stays</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{formatCurr(metrics.accommodationTotal, currency)}</td>
                </tr>
                <tr>
                  <td>Meals & Food Allowance</td>
                  <td>{formatCurr(budget.foodDailyPerPerson, currency)}/person &bull; {budget.days} Days</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{formatCurr(metrics.foodTotal, currency)}</td>
                </tr>
                <tr>
                  <td>Sightseeing, Permits & Guided Activities</td>
                  <td>Regional Passes</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{formatCurr(metrics.sightseeingTotal, currency)}</td>
                </tr>
                {customExpenses.map(ce => (
                  <tr key={ce.id}>
                    <td>Extra: {ce.name}</td>
                    <td>Custom Package</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{formatCurr(ce.costUSD, currency)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid var(--border-blue)", background: "rgba(0, 240, 255, 0.05)" }}>
                  <td style={{ fontWeight: 800, color: "#fff", paddingTop: "0.8rem" }}>GRAND TOTAL ESTIMATE</td>
                  <td style={{ fontWeight: 700, color: "var(--text-muted)", paddingTop: "0.8rem" }}>All inclusive</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "var(--pink-light)", fontSize: "1.1rem", paddingTop: "0.8rem" }}>
                    {formatCurr(metrics.totalCost, currency)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", flexWrap: "wrap", gap: "0.8rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                Verified by GoPocket Voyage Engine &bull; Ref #{pnrNumber}
              </span>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
                  <i className="fa-solid fa-print"></i> Print Receipt
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    exportToCSV(budget, metrics, customExpenses, currency);
                    dispatch(toastSlice.actions.addToast({ type: "success", text: "Receipt CSV spreadsheet saved." }));
                  }}
                >
                  <i className="fa-solid fa-download"></i> Download Statement
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };

    // =========================================================================
    // REACT UI COMPONENTS
    // =========================================================================

    // Toast Container Component
    const ToastContainer = () => {
      const dispatch = useDispatch();
      const toasts = useSelector(state => state.toast.toasts);

      useEffect(() => {
        if (toasts.length > 0) {
          const timer = setTimeout(() => {
            dispatch(toastSlice.actions.removeToast(toasts[0].id));
          }, 3500);
          return () => clearTimeout(timer);
        }
      }, [toasts, dispatch]);

      return (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast-card ${t.type}`}>
              <i className={`fa-solid ${t.type === "success" ? "fa-circle-check" : t.type === "error" ? "fa-circle-exclamation" : "fa-bell"}`}
                 style={{ color: t.type === "success" ? "var(--green-success)" : t.type === "error" ? "var(--red-danger)" : "var(--blue-cyan)" }}></i>
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{t.text}</span>
            </div>
          ))}
        </div>
      );
    };

    // Floating Controls Component (Right side cockpit with Prev / Next + Top)
    const FloatingControls = () => {
      const navigate = useNavigate();
      const location = useLocation();
      const [showTopBtn, setShowTopBtn] = useState(false);

      useEffect(() => {
        const handleScroll = () => {
          if (window.scrollY > 250) {
            setShowTopBtn(true);
          } else {
            setShowTopBtn(false);
          }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
      }, []);

      const scrollToTop = () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      };

      const currentPath = location.pathname;
      const currentIndex = APP_NAV_ITEMS.findIndex(item => item.path === currentPath);
      const activeIdx = currentIndex >= 0 ? currentIndex : 0;

      const handlePrev = () => {
        const prevIndex = (activeIdx - 1 + APP_NAV_ITEMS.length) % APP_NAV_ITEMS.length;
        navigate(APP_NAV_ITEMS[prevIndex].path);
      };

      const handleNext = () => {
        const nextIndex = (activeIdx + 1) % APP_NAV_ITEMS.length;
        navigate(APP_NAV_ITEMS[nextIndex].path);
      };

      return (
        <div className="floating-cockpit-right">
          {/* Stepper Dock */}
          <div className="stepper-dock">
            <button
              className="dock-btn prev"
              onClick={handlePrev}
              title="Previous Step"
            >
              <i className="fa-solid fa-chevron-left"></i>
              <span>Prev</span>
            </button>

            <div className="dock-indicator">
              <span className="dock-indicator-step">{activeIdx + 1} / {APP_NAV_ITEMS.length}</span>
              <div className="dock-indicator-dots">
                {APP_NAV_ITEMS.map((_, i) => (
                  <div key={i} className={`dock-dot ${i === activeIdx ? "active" : ""}`}></div>
                ))}
              </div>
            </div>

            <button
              className="dock-btn"
              onClick={handleNext}
              title="Next Step"
            >
              <span>Next</span>
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          {/* Floating Scroll to Top Button */}
          <button
            className={`scroll-to-top-btn ${showTopBtn ? "visible" : ""}`}
            onClick={scrollToTop}
            title="Scroll to Top"
            aria-label="Scroll to top"
          >
            <i className="fa-solid fa-arrow-up"></i>
            <span>Top</span>
          </button>
        </div>
      );
    };

    // Protected Route Wrapper [Lectures 37-42: Protected Routes]
    const ProtectedRoute = ({ children }) => {
      const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
      if (!isAuthenticated) {
        return <Navigate to="/" replace />;
      }
      return children;
    };

    // Login Overlay Component
    const LoginOverlay = () => {
      const dispatch = useDispatch();
      const [loginId, setLoginId] = useState("");
      const [password, setPassword] = useState("");
      const [showPassword, setShowPassword] = useState(false);
      const [rememberMe, setRememberMe] = useState(false);
      const [message, setMessage] = useState({ text: "", isError: false });

      const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedUser = loginId.trim();
        if (!trimmedUser) {
          setMessage({ text: "Please enter your ID or Email.", isError: true });
          return;
        }
        if (password.length < 4) {
          setMessage({ text: "Password must contain at least 4 characters.", isError: true });
          return;
        }
        setMessage({ text: "Login successful! Opening planner...", isError: false });
        setTimeout(() => {
          dispatch(authSlice.actions.login({ user: trimmedUser, remember: rememberMe }));
          dispatch(toastSlice.actions.addToast({ type: "success", text: `Welcome back, ${trimmedUser}!` }));
        }, 400);
      };

      const handleGuest = () => {
        setMessage({ text: "Guest login successful!", isError: false });
        setTimeout(() => {
          dispatch(authSlice.actions.login({ user: "Guest Traveler", remember: false }));
          dispatch(toastSlice.actions.addToast({ type: "info", text: "Logged in as Guest Traveler." }));
        }, 400);
      };

      return (
        <section id="login-page">
          <div className="login-box">
            <div className="login-logo">
              <i className="fa-solid fa-plane-departure"></i>
            </div>
            <h2>Welcome to <span className="gradient-text">GoPocket</span></h2>
            <p className="login-subtitle">Sign in to access your Family Travel Budget Planner</p>
            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="login-id">ID / Email</label>
                <div className="login-input-wrap">
                  <i className="fa-solid fa-user"></i>
                  <input
                    type="text"
                    id="login-id"
                    className="login-input"
                    placeholder="Enter your ID or Email"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="login-field">
                <label htmlFor="login-password">Password</label>
                <div className="login-input-wrap">
                  <i className="fa-solid fa-lock"></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="login-password"
                    className="login-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password"
                  >
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <button type="submit" className="login-btn">
                <i className="fa-solid fa-right-to-bracket"></i> Login
              </button>
              <button type="button" className="guest-btn" onClick={handleGuest}>
                <i className="fa-solid fa-user-secret"></i> Continue as Guest
              </button>
              {message.text && (
                <p id="login-message" style={{ color: message.isError ? "#fb7185" : "#4ade80" }}>
                  {message.text}
                </p>
              )}
            </form>
          </div>
        </section>
      );
    };

    // Header Navigation with React Router DOM <Link>
    const Header = () => {
      const dispatch = useDispatch();
      const location = useLocation();
      const currency = useSelector((state) => state.currency.selected);
      const user = useSelector((state) => state.auth.user);
      const budget = useSelector((state) => state.budget);
      const metrics = useSelector(selectBudgetMetrics);
      const customExpenses = useSelector((state) => state.customExpenses.items);

      const handleReset = () => {
        dispatch(budgetSlice.actions.resetBudget());
        dispatch(toastSlice.actions.addToast({ type: "info", text: "Reset form to baseline preset." }));
        if (typeof confetti === "function") {
          confetti({
            particleCount: 40,
            spread: 50,
            origin: { y: 0.6 },
            colors: ["#00f0ff", "#ff2a85"]
          });
        }
      };

      const handleCSVDownload = () => {
        exportToCSV(budget, metrics, customExpenses, currency);
        dispatch(toastSlice.actions.addToast({ type: "success", text: "Exported CSV summary spreadsheet." }));
      };

      return (
        <header className="app-header">
          <div className="header-container">
            <Link to="/" className="brand">
              <div className="brand-icon">
                <i className="fa-solid fa-plane-departure"></i>
              </div>
              <div>
                <h1 className="brand-title">Go<span className="gradient-text">Pocket</span></h1>
                <p className="brand-subtitle">Smart Family Travel Planner</p>
              </div>
            </Link>

            <nav className="nav-tabs" aria-label="Main Navigation">
              {APP_NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`tab-btn ${location.pathname === item.path ? "active" : ""}`}
                >
                  <i className={`fa-solid ${item.icon}`}></i> {item.label}
                </Link>
              ))}
            </nav>

            <div className="header-actions">
              <div className="currency-select-wrap" title="Change currency">
                <i className="fa-solid fa-coins" style={{ color: "var(--yellow-warning)", fontSize: "0.85rem" }}></i>
                <select
                  value={currency}
                  onChange={(e) => {
                    dispatch(currencySlice.actions.setCurrency(e.target.value));
                    dispatch(toastSlice.actions.addToast({ type: "info", text: `Switched currency to ${e.target.value}` }));
                  }}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => dispatch(uiSlice.actions.openReceiptModal())}
                title="View Boarding Pass, Tourist Visa & Receipt Slip"
              >
                <i className="fa-solid fa-receipt"></i> Boarding Pass & Visa
              </button>

              <button className="btn btn-outline btn-sm" onClick={handleCSVDownload} title="Export CSV Spreadsheet">
                <i className="fa-solid fa-file-csv"></i> CSV
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => window.print()} title="Print or Save PDF Summary Slip">
                <i className="fa-solid fa-file-pdf"></i> PDF Slip
              </button>

              <button className="btn btn-secondary btn-sm" onClick={handleReset} title="Reset all inputs">
                <i className="fa-solid fa-rotate-right"></i>
              </button>
              {user && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    dispatch(authSlice.actions.logout());
                    dispatch(toastSlice.actions.addToast({ type: "info", text: "Logged out successfully." }));
                  }}
                  title={`Logged in as ${user}. Click to Logout`}
                >
                  <i className="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
              )}
            </div>
          </div>
        </header>
      );
    };

    // Hero Banner with Horizontal Slide Buttons
    const HeroBanner = () => {
      const dispatch = useDispatch();
      const presetContainerRef = useRef(null);

      const handlePresetClick = (presetKey) => {
        dispatch(budgetSlice.actions.loadPreset(presetKey));
        dispatch(toastSlice.actions.addToast({ type: "success", text: `Loaded ${PRESETS[presetKey].tripName}` }));
        if (typeof confetti === "function") {
          confetti({
            particleCount: 45,
            spread: 55,
            origin: { y: 0.6 },
            colors: ["#ff2a85", "#00f0ff", "#ffffff"]
          });
        }
      };

      const scrollPresets = (direction) => {
        if (!presetContainerRef.current) return;
        const amount = direction === "left" ? -180 : 180;
        presetContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
      };

      return (
        <section className="hero-banner">
          <div className="hero-text">
            <h1>Plan Your Next <span className="gradient-text-pink">Family Adventure</span></h1>
            <p>Himachal, Jaipur, Haridwar, Kashmir, Australia, USA, & world destinations with live Boarding Passes, Visa guides, & receipts.</p>
          </div>
          <div className="presets-group">
            <span className="preset-title"><i className="fa-solid fa-bolt"></i> Quick Load Presets</span>
            
            <div className="slider-scroll-wrap" style={{ gap: "6px" }}>
              <button
                className="scroll-arrow-btn"
                onClick={() => scrollPresets("left")}
                title="Slide Presets Left"
                style={{ width: "28px", height: "28px", fontSize: "0.75rem" }}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>

              <div className="preset-buttons" ref={presetContainerRef}>
                <button className="preset-chip" onClick={() => handlePresetClick("beach")}>
                  <i className="fa-solid fa-umbrella-beach"></i> Goa Beach
                </button>
                <button className="preset-chip" onClick={() => handlePresetClick("kashmir")}>
                  <i className="fa-solid fa-snowflake"></i> Kashmir Valley
                </button>
                <button className="preset-chip" onClick={() => handlePresetClick("mountain")}>
                  <i className="fa-solid fa-mountain"></i> Manali Alpine
                </button>
                <button className="preset-chip" onClick={() => handlePresetClick("ladakh")}>
                  <i className="fa-solid fa-compass"></i> Leh Ladakh
                </button>
                <button className="preset-chip" onClick={() => handlePresetClick("dubai")}>
                  <i className="fa-solid fa-city"></i> Dubai Safari
                </button>
                <button className="preset-chip" onClick={() => handlePresetClick("bali")}>
                  <i className="fa-solid fa-spa"></i> Bali Tropical
                </button>
                <button className="preset-chip" onClick={() => handlePresetClick("switzerland")}>
                  <i className="fa-solid fa-mountain-sun"></i> Switzerland
                </button>
                <button className="preset-chip" onClick={() => handlePresetClick("roadtrip")}>
                  <i className="fa-solid fa-car-side"></i> Coastal Roadtrip
                </button>
                <button className="preset-chip" onClick={() => handlePresetClick("luxury")}>
                  <i className="fa-solid fa-crown"></i> Maldives Luxury
                </button>
              </div>

              <button
                className="scroll-arrow-btn"
                onClick={() => scrollPresets("right")}
                title="Slide Presets Right"
                style={{ width: "28px", height: "28px", fontSize: "0.75rem" }}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </section>
      );
    };

    // TAB 1: Planner & Analytics Dashboard
    const PlannerView = () => {
      const dispatch = useDispatch();
      const budget = useSelector((state) => state.budget);
      const currency = useSelector((state) => state.currency.selected);
      const customExpenses = useSelector((state) => state.customExpenses.items);
      const metrics = useSelector(selectBudgetMetrics);

      const [customName, setCustomName] = useState("");
      const [customCostUSD, setCustomCostUSD] = useState("");

      const pieCanvasRef = useRef(null);
      const barCanvasRef = useRef(null);
      const lineCanvasRef = useRef(null);

      const pieChartInstance = useRef(null);
      const barChartInstance = useRef(null);
      const lineChartInstance = useRef(null);

      const updateInput = useCallback((field, value) => {
        dispatch(budgetSlice.actions.updateField({ field, value }));
      }, [dispatch]);

      const handleAddCustomExpense = (e) => {
        e.preventDefault();
        const trimmed = customName.trim();
        const cost = parseFloat(customCostUSD) || 0;
        if (!trimmed || cost <= 0) return;

        const rate = CURRENCY_RATES[currency].rate;
        const normalizedCostUSD = cost / rate;

        dispatch(customExpenseSlice.actions.addCustomExpense({
          id: `ce-${Date.now()}`,
          name: trimmed,
          costUSD: Math.round(normalizedCostUSD),
          icon: "fa-tag"
        }));

        dispatch(toastSlice.actions.addToast({ type: "success", text: `Added extra expense: ${trimmed}` }));
        setCustomName("");
        setCustomCostUSD("");
      };

      // Chart 1: Doughnut Breakdown
      useEffect(() => {
        if (!pieCanvasRef.current) return;
        const ctx = pieCanvasRef.current.getContext("2d");
        const rate = CURRENCY_RATES[currency].rate;
        const sym = CURRENCY_RATES[currency].symbol;

        const pieLabels = ["Transport", "Lodging", "Food & Meals", "Activities", "Shopping", "Emergency"];
        const pieData = [
          metrics.transportTotal * rate,
          metrics.accommodationTotal * rate,
          metrics.foodTotal * rate,
          metrics.sightseeingTotal * rate,
          metrics.shoppingTotal * rate,
          metrics.emergencyTotal * rate
        ];
        const pieColors = ["#ff2a85", "#00f0ff", "#0077ff", "#ff75b5", "#ffb703", "#64748b"];

        if (metrics.customExpensesTotal > 0) {
          pieLabels.push("Custom Expenses");
          pieData.push(metrics.customExpensesTotal * rate);
          pieColors.push("#10b981");
        }

        if (pieChartInstance.current) {
          pieChartInstance.current.data.labels = pieLabels;
          pieChartInstance.current.data.datasets[0].data = pieData;
          pieChartInstance.current.data.datasets[0].backgroundColor = pieColors;
          pieChartInstance.current.update();
        } else {
          pieChartInstance.current = new Chart(ctx, {
            type: "doughnut",
            data: {
              labels: pieLabels,
              datasets: [{
                data: pieData,
                backgroundColor: pieColors,
                borderColor: "#080c17",
                borderWidth: 3,
                hoverOffset: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "right",
                  labels: { color: "#cbd5e1", font: { family: "Plus Jakarta Sans", size: 11 }, padding: 12 }
                },
                tooltip: {
                  callbacks: {
                    label: (context) => ` ${context.label}: ${sym}${Math.round(context.raw).toLocaleString()}`
                  }
                }
              },
              cutout: "68%"
            }
          });
        }
      }, [metrics, currency]);

      // Chart 2: Transport Comparison Bar
      useEffect(() => {
        if (!barCanvasRef.current) return;
        const ctx = barCanvasRef.current.getContext("2d");
        const rate = CURRENCY_RATES[currency].rate;
        const sym = CURRENCY_RATES[currency].symbol;
        const t = metrics.transportComparisons;

        const barData = [t.car * rate, t.bus * rate, t.train * rate, t.flight * rate];
        const bgColors = [
          budget.transportType === "car" ? "#ff2a85" : "rgba(255, 42, 133, 0.4)",
          budget.transportType === "bus" ? "#00f0ff" : "rgba(0, 240, 255, 0.4)",
          budget.transportType === "train" ? "#0088ff" : "rgba(0, 136, 255, 0.4)",
          budget.transportType === "flight" ? "#ff75b5" : "rgba(255, 117, 181, 0.4)"
        ];

        if (barChartInstance.current) {
          barChartInstance.current.data.datasets[0].data = barData;
          barChartInstance.current.data.datasets[0].backgroundColor = bgColors;
          barChartInstance.current.update();
        } else {
          barChartInstance.current = new Chart(ctx, {
            type: "bar",
            data: {
              labels: ["Rental Car", "Express Bus", "Train (AC)", "Flights"],
              datasets: [{
                label: `Estimated Cost (${currency})`,
                data: barData,
                backgroundColor: bgColors,
                borderRadius: 8
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (context) => ` Total Transport: ${sym}${Math.round(context.raw).toLocaleString()}`
                  }
                }
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: "#94a3b8" } },
                y: { grid: { color: "rgba(255, 255, 255, 0.06)" }, ticks: { color: "#94a3b8" } }
              }
            }
          });
        }
      }, [metrics.transportComparisons, budget.transportType, currency]);

      // Chart 3: Cumulative Timeline Line Chart
      useEffect(() => {
        if (!lineCanvasRef.current) return;
        const ctx = lineCanvasRef.current.getContext("2d");
        const rate = CURRENCY_RATES[currency].rate;
        const sym = CURRENCY_RATES[currency].symbol;
        const days = Number(budget.days) || 1;
        const dailyAvg = (metrics.totalCost * rate) / days;

        const labels = [];
        const cumulativeData = [];
        for (let i = 1; i <= days; i++) {
          labels.push(`Day ${i}`);
          cumulativeData.push(Math.round(dailyAvg * i));
        }

        if (lineChartInstance.current) {
          lineChartInstance.current.data.labels = labels;
          lineChartInstance.current.data.datasets[0].data = cumulativeData;
          lineChartInstance.current.update();
        } else {
          lineChartInstance.current = new Chart(ctx, {
            type: "line",
            data: {
              labels: labels,
              datasets: [{
                label: `Cumulative Spend (${currency})`,
                data: cumulativeData,
                borderColor: "#00f0ff",
                backgroundColor: "rgba(0, 240, 255, 0.1)",
                fill: true,
                tension: 0.35,
                pointBackgroundColor: "#ff2a85",
                pointRadius: 4,
                pointHoverRadius: 6
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (context) => ` Cumulative: ${sym}${context.raw.toLocaleString()}`
                  }
                }
              },
              scales: {
                x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#94a3b8" } },
                y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#94a3b8" } }
              }
            }
          });
        }
      }, [metrics.totalCost, budget.days, currency]);

      const smartTips = useMemo(() => {
        const tips = [];
        if (budget.transportType === "flight") {
          tips.push({
            title: "Flight Savings Opportunity",
            icon: "fa-solid fa-plane",
            text: "Booking flights 3-5 weeks ahead or flying mid-week (Tues/Wed) can cut family airfare by 20-30%.",
            pink: false
          });
        } else if (budget.transportType === "car") {
          tips.push({
            title: "Roadtrip Fuel Tip",
            icon: "fa-solid fa-gas-pump",
            text: "Use highway fuel tracker apps to locate affordable petrol/diesel bunks along your drive.",
            pink: true
          });
        }

        if (budget.hotelCategory === "luxury" || budget.hotelCategory === "resort") {
          tips.push({
            title: "Accommodation Upgrade Deal",
            icon: "fa-solid fa-hotel",
            text: "For a family of 4+, booking a 2-bedroom serviced vacation apartment is often 40% cheaper than 2 luxury resort suites.",
            pink: true
          });
        } else {
          tips.push({
            title: "Complimentary Breakfast Perks",
            icon: "fa-solid fa-utensils",
            text: `Filter hotel bookings with 'Breakfast Included' to save up to ${formatCurr(20, currency)} per person every morning.`,
            pink: false
          });
        }

        if (metrics.balance < 0) {
          tips.push({
            title: "Budget Optimization Alert",
            icon: "fa-solid fa-triangle-exclamation",
            text: `You are ${formatCurr(Math.abs(metrics.balance), currency)} over budget. Switching transport to Express Train or dialing back daily food allowance balances the trip.`,
            pink: true
          });
        } else {
          tips.push({
            title: "Sightseeing Combo Heritage Passes",
            icon: "fa-solid fa-ticket",
            text: "Purchase regional city tourism passes or group family museum tickets to save up to 25% on entry fees.",
            pink: false
          });
        }
        return tips;
      }, [budget.transportType, budget.hotelCategory, metrics.balance, currency]);

      return (
        <div className="page-fade-in">
          <HeroBanner />
          <div className="planner-grid">
            <aside className="glass-card">
              <div className="card-header">
                <h2 className="card-title"><i className="fa-solid fa-sliders"></i> Trip Parameters</h2>
                <span className="preset-title" style={{ fontSize: "0.72rem" }}>LIVE CONVERSION</span>
              </div>

              <form onSubmit={(e) => e.preventDefault()}>
                <div className="form-group">
                  <label htmlFor="input-trip-name" className="form-label">Trip Title</label>
                  <div className="input-with-icon">
                    <i className="fa-solid fa-pen-nib"></i>
                    <input
                      type="text"
                      id="input-trip-name"
                      className="input-control"
                      value={budget.tripName}
                      onChange={(e) => updateInput("tripName", e.target.value)}
                      placeholder="e.g. Kashmir Family Holidays"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="input-destination" className="form-label">Destination City / Region</label>
                  <div className="input-with-icon">
                    <i className="fa-solid fa-location-dot"></i>
                    <input
                      type="text"
                      id="input-destination"
                      className="input-control"
                      value={budget.destination}
                      onChange={(e) => updateInput("destination", e.target.value)}
                      placeholder="e.g. Kashmir, Leh, Dubai, Switzerland"
                    />
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--border-glass)", margin: "1.1rem 0" }} />

                <div className="form-group">
                  <label htmlFor="input-available-budget" className="form-label">
                    Total Available Budget
                    <span className="value-badge">{formatCurr(budget.availableBudget, currency)}</span>
                  </label>
                  <div className="input-with-icon">
                    <i className="fa-solid fa-wallet"></i>
                    <input
                      type="number"
                      id="input-available-budget"
                      className="input-control"
                      value={budget.availableBudget}
                      onChange={(e) => updateInput("availableBudget", parseFloat(e.target.value) || 0)}
                      min="100"
                      max="100000"
                      step="50"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="slider-adults" className="form-label">
                    Adult Travelers (12+ yrs)
                    <span className="value-badge">{budget.adults} Adult{budget.adults > 1 ? "s" : ""}</span>
                  </label>
                  <input
                    type="range"
                    id="slider-adults"
                    className="range-slider"
                    min="1"
                    max="10"
                    value={budget.adults}
                    onChange={(e) => updateInput("adults", parseInt(e.target.value, 10))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="slider-children" className="form-label">
                    Children / Toddlers (0-11 yrs)
                    <span className="value-badge">{budget.children} Kid{budget.children !== 1 ? "s" : ""}</span>
                  </label>
                  <input
                    type="range"
                    id="slider-children"
                    className="range-slider"
                    min="0"
                    max="8"
                    value={budget.children}
                    onChange={(e) => updateInput("children", parseInt(e.target.value, 10))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="slider-days" className="form-label">
                    Trip Duration (Days)
                    <span className="value-badge">{budget.days} Day{budget.days > 1 ? "s" : ""}</span>
                  </label>
                  <input
                    type="range"
                    id="slider-days"
                    className="range-slider"
                    min="1"
                    max="30"
                    value={budget.days}
                    onChange={(e) => updateInput("days", parseInt(e.target.value, 10))}
                  />
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--border-glass)", margin: "1.1rem 0" }} />

                <div className="form-group">
                  <label htmlFor="select-transport" className="form-label">Transportation Mode</label>
                  <select
                    id="select-transport"
                    className="select-control"
                    value={budget.transportType}
                    onChange={(e) => updateInput("transportType", e.target.value)}
                  >
                    <option value="car">🚗 Rental / Private Car ({formatCurr(60, currency)} base + {formatCurr(40, currency)}/day)</option>
                    <option value="bus">🚌 Intercity Bus ({formatCurr(35, currency)}/person)</option>
                    <option value="train">🚆 Express Train AC Class ({formatCurr(50, currency)}/person)</option>
                    <option value="flight">✈️ Roundtrip Flights ({formatCurr(220, currency)}/person)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="select-hotel" className="form-label">Accommodation Level</label>
                  <select
                    id="select-hotel"
                    className="select-control"
                    value={budget.hotelCategory}
                    onChange={(e) => updateInput("hotelCategory", e.target.value)}
                  >
                    <option value="budget">⛺ Budget Hostels / Guesthouses ({formatCurr(50, currency)}/night)</option>
                    <option value="midrange">🏨 3-Star Family Hotel ({formatCurr(120, currency)}/night)</option>
                    <option value="luxury">⭐ 4/5-Star Premium Hotel ({formatCurr(250, currency)}/night)</option>
                    <option value="resort">🏝️ Luxury Beach Resort & Villa ({formatCurr(450, currency)}/night)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="slider-food" className="form-label">
                    Daily Food Budget (Per Person)
                    <span className="value-badge">{formatCurr(budget.foodDailyPerPerson, currency)} / day</span>
                  </label>
                  <input
                    type="range"
                    id="slider-food"
                    className="range-slider"
                    min="5"
                    max="150"
                    step="5"
                    value={budget.foodDailyPerPerson}
                    onChange={(e) => updateInput("foodDailyPerPerson", parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="input-sightseeing" className="form-label">Sightseeing & Entry Passes</label>
                  <input
                    type="number"
                    id="input-sightseeing"
                    className="input-control"
                    value={budget.sightseeing}
                    onChange={(e) => updateInput("sightseeing", parseFloat(e.target.value) || 0)}
                    min="0"
                    step="25"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="input-shopping" className="form-label">Shopping & Souvenirs</label>
                  <input
                    type="number"
                    id="input-shopping"
                    className="input-control"
                    value={budget.shopping}
                    onChange={(e) => updateInput("shopping", parseFloat(e.target.value) || 0)}
                    min="0"
                    step="25"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="input-emergency" className="form-label">Emergency & Contingency Cushion</label>
                  <input
                    type="number"
                    id="input-emergency"
                    className="input-control"
                    value={budget.emergency}
                    onChange={(e) => updateInput("emergency", parseFloat(e.target.value) || 0)}
                    min="0"
                    step="25"
                  />
                </div>
              </form>

              {/* Custom Expense Builder */}
              <div className="custom-expenses-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                  <h4 style={{ fontSize: "0.9rem", color: "var(--blue-cyan)" }}>
                    <i className="fa-solid fa-layer-group"></i> Custom Extra Expenses
                  </h4>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Total: {formatCurr(metrics.customExpensesTotal, currency)}
                  </span>
                </div>

                {customExpenses.map((ce) => (
                  <div key={ce.id} className="custom-expense-item">
                    <span className="name"><i className={`fa-solid ${ce.icon || "fa-tag"}`}></i> {ce.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span className="cost">{formatCurr(ce.costUSD, currency)}</span>
                      <button
                        type="button"
                        className="btn-delete-item"
                        onClick={() => {
                          dispatch(customExpenseSlice.actions.removeCustomExpense(ce.id));
                          dispatch(toastSlice.actions.addToast({ type: "info", text: `Removed: ${ce.name}` }));
                        }}
                        title="Remove expense"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  </div>
                ))}

                <form onSubmit={handleAddCustomExpense} style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem" }}>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Expense (e.g. Gondola, Rafting)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{ flex: 2, padding: "0.45rem 0.65rem", fontSize: "0.8rem" }}
                  />
                  <input
                    type="number"
                    className="input-control"
                    placeholder={`Cost (${currency})`}
                    value={customCostUSD}
                    onChange={(e) => setCustomCostUSD(e.target.value)}
                    style={{ flex: 1.2, padding: "0.45rem 0.65rem", fontSize: "0.8rem" }}
                    min="1"
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    <i className="fa-solid fa-plus"></i>
                  </button>
                </form>
              </div>
            </aside>

            {/* Analytics Dashboard */}
            <article className="dashboard-content">
              <div className="metrics-row">
                <div className="metric-card pink-accent">
                  <div className="metric-label">Estimated Total Trip Cost</div>
                  <div className="metric-value">{formatCurr(metrics.totalCost, currency)}</div>
                  <div className="metric-sub">
                    <i className="fa-solid fa-calculator"></i> Real-time calculation in {currency}
                  </div>
                </div>

                <div className="metric-card blue-accent">
                  <div className="metric-label">Cost Per Family Member</div>
                  <div className="metric-value">{formatCurr(metrics.costPerPerson, currency)}</div>
                  <div className="metric-sub">
                    <i className="fa-solid fa-user-group"></i> Total for {metrics.totalPeople} travelers
                  </div>
                </div>

                <div className="metric-card warning-accent">
                  <div className="metric-label">
                    {metrics.balance >= 0 ? "Remaining Cushion" : "Budget Deficit"}
                  </div>
                  <div
                    className="metric-value"
                    style={{ color: metrics.balance >= 0 ? "var(--green-success)" : "var(--red-danger)" }}
                  >
                    {formatCurr(Math.abs(metrics.balance), currency)}
                  </div>
                  <div className="metric-sub">
                    <i
                      className={`fa-solid ${metrics.balance >= 0 ? "fa-circle-check" : "fa-triangle-exclamation"}`}
                      style={{ color: metrics.balance >= 0 ? "var(--green-success)" : "var(--red-danger)" }}
                    ></i>
                    {metrics.balance >= 0 ? "Safe & Under Budget" : "Over Budget Warning"}
                  </div>
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="budget-status-banner">
                <div className="status-info">
                  <div className={`status-icon ${metrics.balance < 0 ? "over-budget" : ""}`}>
                    <i className={`fa-solid ${metrics.balance >= 0 ? "fa-shield-check" : "fa-triangle-exclamation"}`}></i>
                  </div>
                  <div className="status-details">
                    <h4>
                      {metrics.balance >= 0 ? "Trip is Under Available Budget" : `Over Budget by ${formatCurr(Math.abs(metrics.balance), currency)}`}
                    </h4>
                    <p>
                      {metrics.balance >= 0
                        ? `You have ${formatCurr(metrics.balance, currency)} cushion for extra luxury or souvenirs.`
                        : "Consider adjusting hotel level, transport mode, or food allowance."}
                    </p>
                  </div>
                </div>
                <div className="progress-container">
                  <div className="form-label">
                    <span>Budget Capacity Used</span>
                    <span style={{ color: "var(--blue-cyan)", fontWeight: 700 }}>{metrics.percentUsed}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className={`progress-bar-fill ${metrics.balance < 0 ? "over" : ""}`}
                      style={{ width: `${Math.min(metrics.percentUsed, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="charts-grid">
                <div className="glass-card chart-card">
                  <div className="card-header">
                    <h3 className="card-title"><i className="fa-solid fa-chart-pie"></i> Expense Breakdown</h3>
                  </div>
                  <div className="chart-wrapper">
                    <canvas ref={pieCanvasRef}></canvas>
                  </div>
                </div>

                <div className="glass-card chart-card">
                  <div className="card-header">
                    <h3 className="card-title"><i className="fa-solid fa-chart-bar"></i> Transport Cost Comparison</h3>
                  </div>
                  <div className="chart-wrapper">
                    <canvas ref={barCanvasRef}></canvas>
                  </div>
                </div>
              </div>

              {/* Timeline Chart */}
              <div className="glass-card chart-card" style={{ marginBottom: "1.75rem" }}>
                <div className="card-header">
                  <h3 className="card-title"><i className="fa-solid fa-chart-line"></i> Daily Spend Timeline Projection</h3>
                </div>
                <div className="chart-wrapper" style={{ height: "220px" }}>
                  <canvas ref={lineCanvasRef}></canvas>
                </div>
              </div>

              {/* Smart Recommendations */}
              <div className="glass-card">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fa-solid fa-lightbulb" style={{ color: "var(--yellow-warning)" }}></i> Smart Budget Recommendations
                  </h3>
                  <span className="preset-title">AUTO TAILORED</span>
                </div>
                <div className="smart-tips-container">
                  {smartTips.map((tip, idx) => (
                    <div key={idx} className={`tip-card ${tip.pink ? "pink-border" : ""}`}>
                      <div className="tip-icon"><i className={tip.icon}></i></div>
                      <div className="tip-content">
                        <h5>{tip.title}</h5>
                        <p>{tip.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </div>
      );
    };

    // TAB 2: Split-Bill Calculator
    const SplitBillView = () => {
      const currency = useSelector((state) => state.currency.selected);
      const metrics = useSelector(selectBudgetMetrics);

      return (
        <div className="page-fade-in">
          <div className="destinations-header">
            <h2>Family & Group <span className="gradient-text">Split-Bill Calculator</span></h2>
            <p>Fair, weighted financial breakdowns by adult travelers, children, hotel rooms, and daily spend rates.</p>
          </div>

          <div className="split-grid">
            <div className="split-card">
              <h4><i className="fa-solid fa-user-tie"></i> Per Adult Share</h4>
              <div className="split-amount">{formatCurr(metrics.adultShare, currency)}</div>
              <p className="split-desc">
                Calculated across {metrics.adultsCount} adult member{metrics.adultsCount > 1 ? "s" : ""} (full share on flights, hotel & food).
              </p>
            </div>

            <div className="split-card">
              <h4><i className="fa-solid fa-child"></i> Per Child Share</h4>
              <div className="split-amount">{formatCurr(metrics.childShare, currency)}</div>
              <p className="split-desc">
                Calculated across {metrics.kidsCount} kid{metrics.kidsCount !== 1 ? "s" : ""} (subsidized ~60% allocation for food & tickets).
              </p>
            </div>

            <div className="split-card">
              <h4><i className="fa-solid fa-bed"></i> Per Room / Couple Share</h4>
              <div className="split-amount">{formatCurr(metrics.costPerRoom, currency)}</div>
              <p className="split-desc">
                Based on {metrics.roomsRequired} standard family room{metrics.roomsRequired > 1 ? "s" : ""} needed for {metrics.totalPeople} travelers.
              </p>
            </div>

            <div className="split-card">
              <h4><i className="fa-solid fa-calendar-day"></i> Daily Family Burn Rate</h4>
              <div className="split-amount">{formatCurr(metrics.costPerDay, currency)} / day</div>
              <p className="split-desc">
                Average total expenditure needed each single day of your {metrics.days}-day holiday.
              </p>
            </div>
          </div>

          <div className="glass-card" style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div className="card-header">
              <h3 className="card-title"><i className="fa-solid fa-receipt"></i> Split Summary Breakdown</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Total Family Group Size:</span>
                <strong>{metrics.adultsCount} Adults + {metrics.kidsCount} Children = {metrics.totalPeople} Persons</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Total Trip Expense:</span>
                <strong style={{ color: "var(--pink-light)" }}>{formatCurr(metrics.totalCost, currency)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Adult Subtotal ({metrics.adultsCount} × {formatCurr(metrics.adultShare, currency)}):</span>
                <strong>{formatCurr(metrics.adultShare * metrics.adultsCount, currency)}</strong>
              </div>
              {metrics.kidsCount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-glass)", paddingBottom: "0.5rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Children Subtotal ({metrics.kidsCount} × {formatCurr(metrics.childShare, currency)}):</span>
                  <strong>{formatCurr(metrics.childShare * metrics.kidsCount, currency)}</strong>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.2rem" }}>
                <span style={{ color: "var(--blue-cyan)" }}>Single Person Baseline Average:</span>
                <strong style={{ color: "var(--blue-cyan)" }}>{formatCurr(metrics.costPerPerson, currency)}</strong>
              </div>
            </div>
          </div>
        </div>
      );
    };

    // TAB 3: Destinations View (Search, Debounce, Filter, Sort, Dynamic Route Links)
    const DestinationsView = () => {
      const dispatch = useDispatch();
      const navigate = useNavigate();
      const budget = useSelector((state) => state.budget);
      const currency = useSelector((state) => state.currency.selected);
      const destinations = useSelector((state) => state.destinations.list);
      const activeFilter = useSelector((state) => state.destinations.filter);
      const searchQuery = useSelector((state) => state.destinations.searchQuery);
      const sortBy = useSelector((state) => state.destinations.sortBy);
      const currentPage = useSelector((state) => state.destinations.currentPage);
      const itemsPerPage = useSelector((state) => state.destinations.itemsPerPage);

      const debouncedSearch = useDebounce(searchQuery, 300);

      const [showAddForm, setShowAddForm] = useState(false);
      const [name, setName] = useState("");
      const [category, setCategory] = useState("Beach");
      const [tagline, setTagline] = useState("");
      const [costPerDay, setCostPerDay] = useState("");
      const [imageUrl, setImageUrl] = useState("");

      const filterCategories = ["all", "Beach", "Mountain", "Cultural", "Nature", "Luxury"];

      const handleApplyDestination = (destName) => {
        dispatch(budgetSlice.actions.updateField({ field: "destination", value: destName }));
        dispatch(toastSlice.actions.addToast({ type: "success", text: `Applied ${destName} as trip destination!` }));
        navigate("/");
      };

      const handleCreateDestination = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        const rate = CURRENCY_RATES[currency].rate;
        const normalizedCost = (parseFloat(costPerDay) || 80) / rate;

        const newDest = {
          id: `dest-custom-${Date.now()}`,
          name: name.trim(),
          country: "Custom",
          category: category,
          badge: "Custom Destination",
          tagline: tagline.trim() || "Exciting user-added family getaway destination.",
          avgCostPerPersonPerDay: Math.round(normalizedCost),
          rating: 5.0,
          image: imageUrl.trim() || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
          highlights: ["Custom Family Excursion", "Top Local Attractions", "Scenic Spots"],
          description: tagline.trim() || "A custom destination configured directly in GoPocket.",
          visaReq: "Standard ID & Tour Permits Required"
        };

        dispatch(destinationsSlice.actions.addDestination(newDest));
        dispatch(toastSlice.actions.addToast({ type: "success", text: `Created destination card: ${name}` }));
        setName("");
        setTagline("");
        setCostPerDay("");
        setImageUrl("");
        setShowAddForm(false);

        if (typeof confetti === "function") {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ["#00f0ff", "#ff2a85"]
          });
        }
      };

      // Filter, Search & Sort Logic using useMemo [Lectures 31-36, 61-66]
      const processedDestinations = useMemo(() => {
        let result = destinations.filter((dest) => {
          const matchCat = activeFilter === "all" || dest.category.toLowerCase() === activeFilter.toLowerCase();
          const matchSearch = debouncedSearch.trim() === "" ||
            dest.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            dest.tagline.toLowerCase().includes(debouncedSearch.toLowerCase());
          return matchCat && matchSearch;
        });

        if (sortBy === "price-asc") {
          result.sort((a, b) => a.avgCostPerPersonPerDay - b.avgCostPerPersonPerDay);
        } else if (sortBy === "price-desc") {
          result.sort((a, b) => b.avgCostPerPersonPerDay - a.avgCostPerPersonPerDay);
        } else if (sortBy === "rating") {
          result.sort((a, b) => b.rating - a.rating);
        }

        return result;
      }, [destinations, activeFilter, debouncedSearch, sortBy]);

      // Pagination Calculation [Lectures 67-72]
      const totalPages = Math.ceil(processedDestinations.length / itemsPerPage) || 1;
      const paginatedDestinations = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedDestinations.slice(startIndex, startIndex + itemsPerPage);
      }, [processedDestinations, currentPage, itemsPerPage]);

      return (
        <div className="page-fade-in">
          <div className="destinations-header">
            <h2>Recommended <span className="gradient-text">Top Family Destinations</span></h2>
            <p>Explore Himachal Pradesh, Rajasthan, Haridwar, Kashmir, Australia, USA & more with Visa status and Boarding Pass generation.</p>

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center", gap: "0.8rem", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <i className={`fa-solid ${showAddForm ? "fa-xmark" : "fa-plus"}`}></i> {showAddForm ? "Close Form" : "Add Custom Destination"}
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => dispatch(uiSlice.actions.openReceiptModal())}
              >
                <i className="fa-solid fa-passport"></i> View Tourist Pass & Visa
              </button>
            </div>

            {showAddForm && (
              <form className="dest-add-form" onSubmit={handleCreateDestination} style={{ maxWidth: "600px", margin: "1.5rem auto 0", textAlign: "left" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "0.8rem", color: "var(--pink-light)" }}>
                  <i className="fa-solid fa-map-location-dot"></i> Add New Custom Destination
                </h3>
                <div className="form-group">
                  <label className="form-label">Destination Name</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="e.g. Kasol Valley, Jaisalmer Desert"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="select-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Beach">Beach</option>
                      <option value="Mountain">Mountain</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Nature">Nature</option>
                      <option value="Luxury">Luxury</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Avg Cost/Person/Day ({currency})</label>
                    <input
                      type="number"
                      className="input-control"
                      placeholder={`e.g. ${currency === "INR" ? "4000" : "75"}`}
                      value={costPerDay}
                      onChange={(e) => setCostPerDay(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Short Tagline</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="e.g. Golden sand dunes, starry nights, and desert safaris"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Image URL (Optional)</label>
                  <input
                    type="url"
                    className="input-control"
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  <i className="fa-solid fa-circle-plus"></i> Save Destination Card
                </button>
              </form>
            )}
          </div>

          {/* Search, Filter & Sort Toolbar [Lectures 61-66] */}
          <div className="destinations-toolbar">
            <div className="search-input-wrap">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input
                type="text"
                className="input-control"
                placeholder="Search Himachal, Jaipur, Kashmir, USA, Australia..."
                value={searchQuery}
                onChange={(e) => dispatch(destinationsSlice.actions.setSearchQuery(e.target.value))}
              />
            </div>

            <div className="filter-bar" style={{ margin: 0 }}>
              {filterCategories.map((cat) => (
                <button
                  key={cat}
                  className={`filter-btn ${activeFilter.toLowerCase() === cat.toLowerCase() ? "active" : ""}`}
                  onClick={() => dispatch(destinationsSlice.actions.setFilter(cat))}
                >
                  {cat === "all" ? "All Places" : cat}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Sort by:</span>
              <select
                className="select-control"
                style={{ width: "auto", padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}
                value={sortBy}
                onChange={(e) => dispatch(destinationsSlice.actions.setSortBy(e.target.value))}
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          {/* Results Grid with Paginated Items */}
          <div className="destinations-grid">
            {paginatedDestinations.map((d) => {
              const estTotalUSD = d.avgCostPerPersonPerDay * 4 * (budget.days || 5);
              const fitsBudget = (budget.availableBudget || 2500) >= estTotalUSD;

              return (
                <div key={d.id} className="destination-card">
                  <div className="dest-image-container">
                    <img src={d.image} alt={d.name} className="dest-image" loading="lazy" />
                    <span className="dest-badge">{d.badge}</span>
                    <span
                      className="dest-match-tag"
                      style={{ background: fitsBudget ? "var(--green-success)" : "var(--pink-primary)" }}
                    >
                      {fitsBudget ? "✓ Budget Match" : "Stretch Budget"}
                    </span>
                  </div>
                  <div className="dest-body">
                    <div className="dest-title-row">
                      <h3 className="dest-name">{d.name}</h3>
                      <span className="dest-rating">
                        <i className="fa-solid fa-star"></i> {d.rating}
                      </span>
                    </div>
                    <p className="dest-tagline">{d.tagline}</p>
                    <ul className="dest-highlights">
                      {d.highlights.map((h, i) => (
                        <li key={i}><i className="fa-solid fa-check"></i> {h}</li>
                      ))}
                    </ul>
                    <div className="dest-footer">
                      <div className="dest-cost-est">
                        Avg / day: <span>{formatCurr(d.avgCostPerPersonPerDay, currency)}</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <Link to={`/destinations/${d.id}`} className="btn btn-outline btn-sm" title="View Details">
                          <i className="fa-solid fa-eye"></i> Info
                        </Link>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleApplyDestination(d.name)}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls [Lectures 67-72] */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <button
                className="page-btn"
                onClick={() => dispatch(destinationsSlice.actions.setCurrentPage(Math.max(1, currentPage - 1)))}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`page-btn ${page === currentPage ? "active" : ""}`}
                  onClick={() => dispatch(destinationsSlice.actions.setCurrentPage(page))}
                >
                  {page}
                </button>
              ))}

              <button
                className="page-btn"
                onClick={() => dispatch(destinationsSlice.actions.setCurrentPage(Math.min(totalPages, currentPage + 1)))}
                disabled={currentPage === totalPages}
                title="Next Page"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      );
    };

    // TAB 3.5: Dynamic Route Destination Detail Page [Lectures 37-42: Dynamic Routes & Route Params]
    const DestinationDetailPage = () => {
      const { id } = useParams();
      const navigate = useNavigate();
      const dispatch = useDispatch();
      const currency = useSelector(state => state.currency.selected);
      const destinations = useSelector(state => state.destinations.list);

      const destination = destinations.find(d => d.id === id);

      if (!destination) {
        return (
          <div className="not-found-container page-fade-in">
            <div className="not-found-code">404</div>
            <h2>Destination Not Found</h2>
            <p style={{ color: "var(--text-muted)", margin: "1rem 0 1.5rem" }}>
              The travel spot you requested does not exist or has been removed.
            </p>
            <Link to="/destinations" className="btn btn-primary">
              <i className="fa-solid fa-arrow-left"></i> Back to Destinations
            </Link>
          </div>
        );
      }

      const handleApply = () => {
        dispatch(budgetSlice.actions.updateField({ field: "destination", value: destination.name }));
        dispatch(toastSlice.actions.addToast({ type: "success", text: `Applied ${destination.name} to budget plan!` }));
        navigate("/");
      };

      return (
        <div className="dest-detail-container page-fade-in">
          <div className="dest-detail-banner">
            <img src={destination.image} alt={destination.name} />
            <div className="dest-detail-overlay">
              <span className="dest-badge" style={{ position: "static", alignSelf: "flex-start", marginBottom: "0.75rem" }}>
                {destination.badge} &bull; {destination.category}
              </span>
              <h1 style={{ fontSize: "2.3rem", color: "#fff" }}>{destination.name}</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>{destination.tagline}</p>
            </div>
          </div>

          <div className="glass-card" style={{ marginBottom: "2rem" }}>
            <div className="card-header">
              <h2 className="card-title"><i className="fa-solid fa-circle-info"></i> Spot Overview & Highlights</h2>
              <div className="dest-rating" style={{ fontSize: "1.1rem" }}>
                <i className="fa-solid fa-star"></i> {destination.rating} / 5.0 Rating
              </div>
            </div>

            <p style={{ color: "var(--text-main)", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "1.5rem" }}>
              {destination.description || destination.tagline}
            </p>

            <div style={{ background: "rgba(0, 240, 255, 0.08)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-blue)", marginBottom: "1.5rem" }}>
              <strong style={{ color: "var(--blue-cyan)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <i className="fa-solid fa-passport"></i> Visa & Entry Regulation:
              </strong>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
                {destination.visaReq || "Government-authorized photo ID or tourist e-Visa required prior to boarding."}
              </p>
            </div>

            <h4 style={{ color: "var(--blue-cyan)", marginBottom: "0.75rem", fontSize: "1rem" }}>
              Key Family Highlights & Activities
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
              {destination.highlights.map((h, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-glass)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <i className="fa-solid fa-check" style={{ color: "var(--green-success)" }}></i>
                  <span style={{ fontSize: "0.88rem" }}>{h}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", borderTop: "1px solid var(--border-glass)", paddingTop: "1.25rem" }}>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Estimated Cost per Person: </span>
                <strong style={{ color: "var(--blue-cyan)", fontSize: "1.3rem" }}>{formatCurr(destination.avgCostPerPersonPerDay, currency)} / day</strong>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn btn-outline" onClick={() => dispatch(uiSlice.actions.openReceiptModal())}>
                  <i className="fa-solid fa-receipt"></i> View Pass & Receipt
                </button>
                <Link to="/destinations" className="btn btn-secondary">
                  <i className="fa-solid fa-arrow-left"></i> All Spots
                </Link>
                <button className="btn btn-primary" onClick={handleApply}>
                  <i className="fa-solid fa-calculator"></i> Apply Destination to Planner
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };

    // TAB 4: Itinerary & Live REST Weather API [Lectures 67-72: Async, Loading & Error states]
    const ItineraryView = () => {
      const dispatch = useDispatch();
      const budget = useSelector((state) => state.budget);
      const daysPlan = useSelector((state) => state.itinerary.daysPlan);
      const weather = useSelector((state) => state.weather);

      const [editingDay, setEditingDay] = useState(null);
      const [titleEdit, setTitleEdit] = useState("");
      const [actEdit, setActEdit] = useState("");

      const startEdit = (dayObj) => {
        setEditingDay(dayObj.day);
        setTitleEdit(dayObj.title);
        setActEdit(dayObj.activity);
      };

      const saveEdit = (day) => {
        dispatch(itinerarySlice.actions.updateDayPlan({
          day,
          title: titleEdit,
          activity: actEdit
        }));
        dispatch(toastSlice.actions.addToast({ type: "info", text: `Updated Day ${day} plan.` }));
        setEditingDay(null);
      };

      const handleFetchWeather = () => {
        // Strip country name for cleaner geocoding
        const cleanCity = budget.destination.split(",")[0].trim();
        dispatch(fetchLiveWeather(cleanCity));
      };

      return (
        <div className="page-fade-in">
          <div className="destinations-header">
            <h2>Day-Wise <span className="gradient-text">Itinerary & Weather</span></h2>
            <p>Plan daily activities, schedule excursions, and preview live weather conditions for {budget.destination}.</p>
          </div>

          <div className="itinerary-container">
            {/* Live REST API Weather Section */}
            <div className="live-api-status-banner">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.2rem" }}>
                  <i className="fa-solid fa-satellite-dish" style={{ color: "var(--blue-cyan)" }}></i>
                  <strong style={{ fontSize: "0.95rem" }}>Live Weather REST API Engine</strong>
                  <span className="preset-title" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>OPEN-METEO API</span>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  Query live satellite meteorological feeds for destination: <strong>{budget.destination}</strong>
                </p>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={handleFetchWeather}
                disabled={weather.status === "loading"}
              >
                {weather.status === "loading" ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Fetching...</>
                ) : (
                  <><i className="fa-solid fa-cloud-arrow-down"></i> Sync Live Weather</>
                )}
              </button>
            </div>

            {/* Weather State Handling: Loading, Error, Succeeded [Lectures 67-72] */}
            {weather.status === "loading" && (
              <div className="glass-card" style={{ textAlign: "center", padding: "1.5rem", marginBottom: "1.5rem" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "1.8rem", color: "var(--blue-cyan)", marginBottom: "0.5rem" }}></i>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Calling Open-Meteo REST API & geocoding coordinates...</p>
              </div>
            )}

            {weather.status === "failed" && (
              <div className="glass-card" style={{ borderColor: "var(--red-danger)", padding: "1.25rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ color: "var(--red-danger)", fontSize: "1.4rem" }}></i>
                  <div>
                    <h5 style={{ color: "var(--red-danger)" }}>API Request Failed</h5>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{weather.error}</p>
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={handleFetchWeather}>
                  <i className="fa-solid fa-rotate-right"></i> Retry
                </button>
              </div>
            )}

            {weather.status === "succeeded" && weather.data && (
              <div className="glass-card" style={{ borderColor: "var(--green-success)", padding: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <i className="fa-solid fa-cloud-sun" style={{ color: "var(--yellow-warning)", fontSize: "1.8rem" }}></i>
                    <div>
                      <h4 style={{ color: "var(--text-main)", fontSize: "1.1rem" }}>
                        Live Weather: {weather.data.city}, {weather.data.country}
                      </h4>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        Last synced at {weather.data.fetchedAt} via Open-Meteo REST API
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1.5rem" }}>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>TEMPERATURE</span>
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--pink-light)" }}>{weather.data.currentTemp}°C</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>HUMIDITY</span>
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--blue-cyan)" }}>{weather.data.humidity}%</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>WIND</span>
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--yellow-warning)" }}>{weather.data.windSpeed} km/h</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <h4 style={{ fontSize: "1rem", color: "var(--blue-cyan)", marginBottom: "0.85rem" }}>
              <i className="fa-solid fa-cloud-sun-rain"></i> 5-Day Projected Weather Strip
            </h4>
            <div className="weather-forecast-strip">
              {daysPlan.map((d) => (
                <div key={d.day} className="weather-card">
                  <div className="weather-day">Day {d.day}</div>
                  <div className="weather-icon"><i className={`fa-solid ${d.weather.icon}`}></i></div>
                  <div className="weather-temp">{d.weather.temp}</div>
                  <div className="weather-condition">{d.weather.cond}</div>
                </div>
              ))}
            </div>

            <h4 style={{ fontSize: "1rem", color: "var(--pink-light)", marginBottom: "0.85rem" }}>
              <i className="fa-solid fa-list-ol"></i> Activity Schedule & Notes
            </h4>
            {daysPlan.map((d) => (
              <div key={d.day} className="itinerary-day-row">
                <div className="itinerary-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span className="itinerary-day-badge">Day {d.day}</span>
                    <strong style={{ fontSize: "1.05rem", color: "var(--text-main)" }}>{d.title}</strong>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => startEdit(d)}
                  >
                    <i className="fa-solid fa-pencil"></i> Edit
                  </button>
                </div>

                {editingDay === d.day ? (
                  <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <input
                      type="text"
                      className="input-control"
                      value={titleEdit}
                      onChange={(e) => setTitleEdit(e.target.value)}
                    />
                    <textarea
                      className="input-control"
                      rows="2"
                      value={actEdit}
                      onChange={(e) => setActEdit(e.target.value)}
                    ></textarea>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(d.day)}>
                        Save Day {d.day}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingDay(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: "1.4" }}>
                    {d.activity}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    };

    // TAB 5: Travel Packing Checklist
    const ChecklistView = () => {
      const dispatch = useDispatch();
      const items = useSelector((state) => state.checklist.items);
      const [customText, setCustomText] = useState("");

      const totalItems = items.length;
      const completedItems = items.filter((i) => i.done).length;
      const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      const categories = useMemo(() => {
        return [...new Set(items.map((i) => i.category))];
      }, [items]);

      const handleAdd = (e) => {
        e.preventDefault();
        const trimmed = customText.trim();
        if (!trimmed) return;
        dispatch(checklistSlice.actions.addItem(trimmed));
        dispatch(toastSlice.actions.addToast({ type: "success", text: `Added to checklist: ${trimmed}` }));
        setCustomText("");
      };

      return (
        <div className="page-fade-in">
          <div className="checklist-container">
            <div className="checklist-progress-card">
              <div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>
                  Family Travel <span className="gradient-text-pink">Preparation Checklist</span>
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  Never leave essential documents, emergency medicines, or kids entertainment behind.
                </p>
              </div>
              <div style={{ textAlign: "right", minWidth: "160px" }}>
                <div style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-heading)", color: "var(--pink-light)" }}>
                  {percent}%
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {completedItems} of {totalItems} items packed
                </div>
              </div>
            </div>

            <form className="add-item-bar" onSubmit={handleAdd}>
              <input
                type="text"
                className="input-control"
                placeholder="Add custom item to checklist (e.g. Swim Goggles, Board Games, Extra Baby Food)..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>
                <i className="fa-solid fa-plus"></i> Add Item
              </button>
            </form>

            <div id="checklist-groups-container">
              {categories.map((cat) => (
                <div key={cat} className="checklist-group">
                  <h3 className="category-title">
                    <i className="fa-solid fa-tag"></i> {cat}
                  </h3>
                  {items
                    .filter((i) => i.category === cat)
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`checklist-item ${item.done ? "done" : ""}`}
                        onClick={() => dispatch(checklistSlice.actions.toggleItem(item.id))}
                      >
                        <div className="chk-label">
                          <div className="custom-checkbox">
                            {item.done && <i className="fa-solid fa-check"></i>}
                          </div>
                          <span className="chk-text">{item.text}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-delete-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch(checklistSlice.actions.deleteItem(item.id));
                            dispatch(toastSlice.actions.addToast({ type: "info", text: "Removed item from checklist." }));
                          }}
                          title="Remove item"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

    // 404 Not Found Component [Lectures 37-42: 404 Pages]
    const NotFoundPage = () => (
      <div className="not-found-container page-fade-in">
        <div className="not-found-code">404</div>
        <h2>Page Not Found</h2>
        <p style={{ color: "var(--text-muted)", margin: "1rem 0 1.5rem" }}>
          The page or route you are looking for doesn't exist or has moved.
        </p>
        <Link to="/" className="btn btn-primary">
          <i className="fa-solid fa-house"></i> Return to Planner
        </Link>
      </div>
    );

    // Footer
    const Footer = () => (
      <footer className="app-footer">
        <div>
          <strong>GoPocket VoyageSmart</strong> &copy; 2026 Smart Family Travel Budget Planner.
        </div>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <span><i className="fa-solid fa-palette" style={{ color: "var(--pink-primary)" }}></i> Pink & Blue Theme</span>
          <span><i className="fa-solid fa-code" style={{ color: "var(--blue-cyan)" }}></i> React Router v6 & Redux Toolkit</span>
        </div>
      </footer>
    );

    // Root App Container with HashRouter
    const App = () => {
      const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

      useEffect(() => {
        if (!isAuthenticated) {
          document.body.classList.add("app-locked");
        } else {
          document.body.classList.remove("app-locked");
        }
      }, [isAuthenticated]);

      return (
        <HashRouter>
          {!isAuthenticated && <LoginOverlay />}
          <TouristReceiptModal />
          <ToastContainer />
          <Header />
          <main className="main-wrapper">
            <Routes>
              {/* Core Page Routes [Lectures 37-42] */}
              <Route path="/" element={<PlannerView />} />
              <Route path="/split-bill" element={<SplitBillView />} />
              <Route path="/destinations" element={<DestinationsView />} />
              
              {/* Dynamic Route [Lectures 37-42] */}
              <Route path="/destinations/:id" element={<DestinationDetailPage />} />
              
              {/* Protected Routes [Lectures 37-42] */}
              <Route path="/itinerary" element={<ProtectedRoute><ItineraryView /></ProtectedRoute>} />
              <Route path="/checklist" element={<ProtectedRoute><ChecklistView /></ProtectedRoute>} />

              {/* 404 Catch-All Page */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
          <FloatingControls />
        </HashRouter>
      );
    };

    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(
      <Provider store={store}>
        <App />
      </Provider>
    );
