import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Apilink from "../baseUrl/baseUrl";
import AlertModal from "../components/AlertModal";
import AlertSuccess from "../components/AlertSuccess";
import TopToolbar from "../components/TopToolbar";
import SideNav from "../components/SideNav";
import "../css/CreateCurrencyScreen.css";

// Comprehensive list of currency symbols
const CURRENCY_SYMBOLS = [
  { code: "USD", symbol: "$", name: "United States Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound Sterling" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
  { code: "AED", symbol: "د.إ", name: "United Arab Emirates Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "PLN", symbol: "zł", name: "Polish Złoty" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint" },
  { code: "ILS", symbol: "₪", name: "Israeli New Shekel" },
  { code: "CLP", symbol: "CLP$", name: "Chilean Peso" },
  { code: "COP", symbol: "COL$", name: "Colombian Peso" },
  { code: "ARS", symbol: "AR$", name: "Argentine Peso" },
  { code: "PEN", symbol: "S/.", name: "Peruvian Sol" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "ETB", symbol: "Br", name: "Ethiopian Birr" },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
  { code: "MAD", symbol: "MAD", name: "Moroccan Dirham" },
  { code: "QAR", symbol: "QR", name: "Qatari Riyal" },
  { code: "KWD", symbol: "KD", name: "Kuwaiti Dinar" },
  { code: "OMR", symbol: "OMR", name: "Omani Rial" },
  { code: "JOD", symbol: "JOD", name: "Jordanian Dinar" },
  { code: "LBP", symbol: "L£", name: "Lebanese Pound" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  { code: "BYN", symbol: "Br", name: "Belarusian Ruble" },
  { code: "KZT", symbol: "₸", name: "Kazakhstani Tenge" },
  { code: "UZS", symbol: "so'm", name: "Uzbekistani Som" },
  { code: "AZN", symbol: "₼", name: "Azerbaijani Manat" },
  { code: "GEL", symbol: "₾", name: "Georgian Lari" },
  { code: "AMD", symbol: "֏", name: "Armenian Dram" },
  { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar" },
  { code: "HNL", symbol: "L", name: "Honduran Lempira" },
  { code: "GTQ", symbol: "Q", name: "Guatemalan Quetzal" },
  { code: "CRC", symbol: "₡", name: "Costa Rican Colón" },
  { code: "DOP", symbol: "RD$", name: "Dominican Peso" },
  { code: "JMD", symbol: "J$", name: "Jamaican Dollar" },
  { code: "BHD", symbol: "BD", name: "Bahraini Dinar" },
  { code: "IQD", symbol: "IQD", name: "Iraqi Dinar" },
  { code: "LYD", symbol: "LD", name: "Libyan Dinar" },
  { code: "TND", symbol: "DT", name: "Tunisian Dinar" },
  { code: "MUR", symbol: "₨", name: "Mauritian Rupee" },
  { code: "NPR", symbol: "₨", name: "Nepalese Rupee" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
  { code: "MMK", symbol: "K", name: "Myanmar Kyat" },
  { code: "KHR", symbol: "៛", name: "Cambodian Riel" },
  { code: "LAK", symbol: "₭", name: "Laotian Kip" },
  { code: "MNT", symbol: "₮", name: "Mongolian Tögrög" },
  { code: "BND", symbol: "B$", name: "Brunei Dollar" },
  { code: "FJD", symbol: "FJ$", name: "Fijian Dollar" },
  { code: "XPF", symbol: "₣", name: "CFP Franc" },
  { code: "XAF", symbol: "FCFA", name: "Central African CFA Franc" },
  { code: "XOF", symbol: "CFA", name: "West African CFA Franc" },
  { code: "RWF", symbol: "FRw", name: "Rwandan Franc" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
  { code: "ZMW", symbol: "ZK", name: "Zambian Kwacha" },
  { code: "MWK", symbol: "MK", name: "Malawian Kwacha" },
  { code: "MOP", symbol: "MOP$", name: "Macanese Pataca" },
  { code: "PGK", symbol: "K", name: "Papua New Guinean Kina" },
  { code: "SBD", symbol: "SI$", name: "Solomon Islands Dollar" },
  { code: "TOP", symbol: "T$", name: "Tongan Paʻanga" },
  { code: "VUV", symbol: "VT", name: "Vanuatu Vatu" },
  { code: "WST", symbol: "WS$", name: "Samoan Tālā" },
  { code: "STN", symbol: "Db", name: "São Tomé and Príncipe Dobra" },
  { code: "CDF", symbol: "FC", name: "Congolese Franc" },
  { code: "GMD", symbol: "D", name: "Gambian Dalasi" },
  { code: "SLL", symbol: "Le", name: "Sierra Leonean Leone" },
  { code: "SYP", symbol: "£S", name: "Syrian Pound" },
  { code: "YER", symbol: "﷼", name: "Yemeni Rial" },
  { code: "AFN", symbol: "؋", name: "Afghan Afghani" },
  { code: "ALL", symbol: "L", name: "Albanian Lek" },
  { code: "DZD", symbol: "د.ج", name: "Algerian Dinar" },
  { code: "AOA", symbol: "Kz", name: "Angolan Kwanza" },
  { code: "BBD", symbol: "Bds$", name: "Barbadian Dollar" },
  { code: "BMD", symbol: "BD$", name: "Bermudian Dollar" },
  { code: "BTN", symbol: "Nu.", name: "Bhutanese Ngultrum" },
  { code: "BOB", symbol: "Bs.", name: "Bolivian Boliviano" },
  { code: "BWP", symbol: "P", name: "Botswana Pula" },
  { code: "BIF", symbol: "FBu", name: "Burundian Franc" },
  { code: "KYD", symbol: "CI$", name: "Cayman Islands Dollar" },
  { code: "DJF", symbol: "Fdj", name: "Djiboutian Franc" },
  { code: "ERN", symbol: "Nfk", name: "Eritrean Nakfa" },
  { code: "SZL", symbol: "E", name: "Swazi Lilangeni" },
  { code: "FKP", symbol: "FK£", name: "Falkland Islands Pound" },
  { code: "GIP", symbol: "£", name: "Gibraltar Pound" },
  { code: "GYD", symbol: "G$", name: "Guyanese Dollar" },
  { code: "HTG", symbol: "G", name: "Haitian Gourde" },
  { code: "ISK", symbol: "kr", name: "Icelandic Króna" },
  { code: "KGS", symbol: "с", name: "Kyrgyzstani Som" },
  { code: "LRD", symbol: "L$", name: "Liberian Dollar" },
  { code: "MGA", symbol: "Ar", name: "Malagasy Ariary" },
  { code: "MVR", symbol: "Rf", name: "Maldivian Rufiyaa" },
  { code: "MZN", symbol: "MT", name: "Mozambican Metical" },
  { code: "NAD", symbol: "N$", name: "Namibian Dollar" },
  { code: "PAB", symbol: "B/.", name: "Panamanian Balboa" },
  { code: "PYG", symbol: "₲", name: "Paraguayan Guaraní" },
  { code: "RSD", symbol: "din", name: "Serbian Dinar" },
  { code: "SCR", symbol: "SR", name: "Seychellois Rupee" },
  { code: "SHP", symbol: "£", name: "Saint Helena Pound" },
  { code: "SOS", symbol: "Sh.so.", name: "Somali Shilling" },
  { code: "SSP", symbol: "£", name: "South Sudanese Pound" },
  { code: "SRD", symbol: "$", name: "Surinamese Dollar" },
  { code: "TJS", symbol: "SM", name: "Tajikistani Somoni" },
  { code: "TMT", symbol: "T", name: "Turkmenistani Manat" },
  { code: "TTD", symbol: "TT$", name: "Trinidad and Tobago Dollar" },
  { code: "TVD", symbol: "$", name: "Tuvaluan Dollar" },
  { code: "VES", symbol: "Bs.S", name: "Venezuelan Bolívar" },
  { code: "ZWL", symbol: "ZWD$", name: "Zimbabwean Dollar" },
  { code: "BAM", symbol: "KM", name: "Bosnia-Herzegovina Convertible Mark" },
  { code: "CUP", symbol: "$", name: "Cuban Peso" },
  { code: "GGP", symbol: "£", name: "Guernsey Pound" },
  { code: "IMP", symbol: "£", name: "Isle of Man Pound" },
  { code: "JEP", symbol: "£", name: "Jersey Pound" },
  { code: "MRU", symbol: "UM", name: "Mauritanian Ouguiya" },
  { code: "RON", symbol: "lei", name: "Romanian Leu" },
  { code: "SLE", symbol: "Le", name: "Sierra Leonean Leone (new)" },
  { code: "VED", symbol: "Bs.D", name: "Venezuelan Digital Bolívar" },
  { code: "XCD", symbol: "EC$", name: "East Caribbean Dollar" },
  { code: "ANG", symbol: "ƒ", name: "Netherlands Antillean Guilder" },
  { code: "AWG", symbol: "ƒ", name: "Aruban Florin" },
  { code: "CVE", symbol: "$", name: "Cape Verdean Escudo" },
  { code: "KMF", symbol: "CF", name: "Comorian Franc" },
  { code: "CHE", symbol: "CHE", name: "WIR Euro" },
  { code: "CHW", symbol: "CHW", name: "WIR Franc" },
  { code: "CNH", symbol: "¥", name: "Chinese Yuan (offshore)" },
  { code: "MKD", symbol: "ден", name: "Macedonian Denar" },
  { code: "PRB", symbol: "р.", name: "Transnistrian Ruble" },
  { code: "SDG", symbol: "ج.س.", name: "Sudanese Pound" },
  { code: "UYU", symbol: "$U", name: "Uruguayan Peso" },
];

const CreateCurrencyScreen = () => {
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [symbolModalVisible, setSymbolModalVisible] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [currencyName, setCurrencyName] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSymbols, setFilteredSymbols] = useState(CURRENCY_SYMBOLS);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [baseCurrencyModalVisible, setBaseCurrencyModalVisible] = useState(false);
  const [selectedBaseCurrency, setSelectedBaseCurrency] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();

  // Sidebar and layout states
  const [activeScreen, setActiveScreen] = useState("currencies");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Animation states
  const [fadeAnim, setFadeAnim] = useState(0);
  const [slideAnim, setSlideAnim] = useState(50);

  const apiLink = Apilink.getLink();

  useEffect(() => {
    fetchCurrencies();
  }, []);

  useEffect(() => {
    if (modalVisible || symbolModalVisible || baseCurrencyModalVisible) {
      setFadeAnim(1);
      setSlideAnim(0);
    } else {
      setFadeAnim(0);
      setSlideAnim(50);
    }
  }, [modalVisible, symbolModalVisible, baseCurrencyModalVisible]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSymbols(CURRENCY_SYMBOLS);
    } else {
      const filtered = CURRENCY_SYMBOLS.filter(
        (item) =>
          item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSymbols(filtered);
    }
  }, [searchQuery]);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const token = user.token;

      const response = await fetch(`${apiLink}/currencies`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.length === 0) {
          await createDefaultUSD();
        } else {
          setCurrencies(data);
          await loadBaseCurrency(data);
        }
      } else {
        console.error("Failed to fetch currencies");
      }
    } catch (error) {
      console.error("Error fetching currencies:", error);
    } finally {
      setLoading(false);
    }
  };

  const createCurrency = async (currencyData) => {
    try {
      const token = user.token;

      const response = await fetch(`${apiLink}/currencies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(currencyData),
      });

      if (response.ok) {
        const newCurrency = await response.json();
        return newCurrency;
      } else {
        console.error("Failed to create currency");
        return null;
      }
    } catch (error) {
      console.error("Error creating currency:", error);
      return null;
    }
  };

  const createDefaultUSD = async () => {
    try {
      const token = user.token;

      const checkResponse = await fetch(`${apiLink}/currencies`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (checkResponse.ok) {
        const existingCurrencies = await checkResponse.json();

        if (existingCurrencies.length > 0) {
          console.log("Currencies already exist, skipping USD creation");
          setCurrencies(existingCurrencies);
          await loadBaseCurrency(existingCurrencies);
          return;
        }
      }

      const defaultUSD = {
        symbol: "$",
        name: "United States Dollar",
        rate: 1.0,
        code: "USD",
        isDefault: true,
        isBase: true,
        user_id: user.user_id,
      };

      const response = await fetch(`${apiLink}/currencies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(defaultUSD),
      });

      if (response.ok) {
        const newCurrency = await response.json();
        setCurrencies([newCurrency]);
        setSelectedBaseCurrency(newCurrency);
      } else {
        console.error("Failed to create default USD");
      }
    } catch (error) {
      console.error("Error creating default USD:", error);
    }
  };

  const updateCurrency = async (id, currencyData) => {
    try {
      const token = user.token;

      const response = await fetch(`${apiLink}/currencies/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(currencyData),
      });

      if (response.ok) {
        const updatedCurrency = await response.json();
        return updatedCurrency;
      } else {
        console.error("Failed to update currency");
        return null;
      }
    } catch (error) {
      console.error("Error updating currency:", error);
      return null;
    }
  };

  const setBaseCurrencyAPI = async (currencyId, currencyData) => {
    try {
      const token = user.token;

      const response = await fetch(`${apiLink}/currencies/${currencyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(currencyData),
      });

      if (response.ok) {
        return true;
      } else {
        console.error("Failed to set base currency");
        return false;
      }
    } catch (error) {
      console.error("Error setting base currency:", error);
      return false;
    }
  };

  const handleSelectBaseCurrency = async (currency) => {
    try {
      setProcessing(true);

      const baseCurrencyData = {
        symbol: currency.symbol,
        code: currency.code,
        name: currency.name,
        rate: currency.rate,
        user_id: currency.user_id,
        isDefault: currency.isDefault === 1 ? true : false,
        isBase: true,
      };

      const success = await setBaseCurrencyAPI(currency.id, baseCurrencyData);

      if (success) {
        setSelectedBaseCurrency(currency);
        await fetchCurrencies();
      }
    } catch (error) {
      console.error("Error setting base currency:", error);
    } finally {
      setProcessing(false);
      closeBaseCurrencyModal();
    }
  };

  const deleteCurrencyAPI = async (id) => {
    try {
      const token = user.token;

      const response = await fetch(`${apiLink}/currencies/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return true;
      } else {
        console.error("Failed to delete currency");
        return false;
      }
    } catch (error) {
      console.error("Error deleting currency:", error);
      return false;
    }
  };

  const loadBaseCurrency = async (currenciesList = currencies) => {
    try {
      const baseCurrency =
        currenciesList.find(
          (currency) => currency.isBase === true || currency.isBase === 1
        ) || currenciesList[0];

      setSelectedBaseCurrency(baseCurrency);
    } catch (error) {
      console.error("Error loading base currency:", error);
    }
  };

  const openCreateModal = () => {
    setEditingCurrency(null);
    setSelectedSymbol("");
    setCurrencyName("");
    setExchangeRate("");
    setSearchQuery("");
    setModalVisible(true);
  };

  const openEditModal = (currency) => {
    setEditingCurrency(currency);
    setSelectedSymbol(currency.symbol);
    setCurrencyName(currency.name);
    setExchangeRate(currency?.rate?.toString());
    setSearchQuery("");
    setModalVisible(true);
  };

  const closeCreateModal = () => {
    setModalVisible(false);
    setEditingCurrency(null);
  };

  const openSymbolModal = () => {
    setSearchQuery("");
    setSymbolModalVisible(true);
  };

  const closeSymbolModal = () => {
    setSymbolModalVisible(false);
  };

  const openBaseCurrencyModal = () => {
    if (currencies.length === 0) {
      return;
    }
    setBaseCurrencyModalVisible(true);
  };

  const closeBaseCurrencyModal = () => {
    setBaseCurrencyModalVisible(false);
  };

  const handleCreateCurrency = async () => {
    if (!selectedSymbol) {
      return;
    }
    if (!currencyName.trim()) {
      return;
    }
    if (!exchangeRate.trim() || isNaN(parseFloat(exchangeRate))) {
      return;
    }

    const selectedCurrency = CURRENCY_SYMBOLS.find(
      (item) => item.symbol === selectedSymbol
    );
    const currencyCode = selectedCurrency ? selectedCurrency.code : "";

    const currencyData = {
      symbol: selectedSymbol,
      name: currencyName.trim(),
      rate: parseFloat(exchangeRate),
      code: currencyCode,
      user_id: user.user_id,
      isDefault: false,
      isBase: false,
    };

    setProcessing(true);

    try {
      if (editingCurrency) {
        const updatedCurrency = await updateCurrency(
          editingCurrency.id,
          currencyData
        );
        if (updatedCurrency) {
          await fetchCurrencies();
        }
      } else {
        const newCurrency = await createCurrency(currencyData);
        if (newCurrency) {
          await fetchCurrencies();
        }
      }
    } finally {
      setProcessing(false);
      closeCreateModal();
    }
  };

  const deleteCurrency = (currencyId) => {
    if (window.confirm("Are you sure you want to delete this currency?")) {
      setProcessing(true);
      deleteCurrencyAPI(currencyId)
        .then(async (success) => {
          if (success) {
            await fetchCurrencies();
          }
        })
        .finally(() => {
          setProcessing(false);
        });
    }
  };

  const CurrencyItem = ({ currency }) => (
    <div className="currency-item">
      <div 
        className={`currency-info ${currency.isDefault ? 'currency-info-default' : ''}`}
        onClick={() => !currency.isDefault && openEditModal(currency)}
      >
        <div className="currency-symbol-container">
          <div className="currency-symbol">{currency.symbol}</div>
        </div>
        <div className="currency-details">
          <div className="currency-name">{currency.name}</div>
          <div className="currency-rate">
            1 {selectedBaseCurrency?.code || "BASE"} = {currency.rate} {currency.symbol}
          </div>
        </div>
      </div>

      <div className="currency-actions">
        {!currency.isDefault && (
          <>
            <button
              className="currency-edit-button"
              onClick={() => openEditModal(currency)}
            >
              <span className="currency-edit-icon">✏️</span>
            </button>
            <button
              className="currency-delete-button"
              onClick={() => deleteCurrency(currency.id)}
            >
              <span className="currency-delete-icon">🗑️</span>
            </button>
          </>
        )}

        <div className={`currency-default-badge ${currency.isDefault ? 'default-badge' : 'notedefault-badge'}`}>
          {currency.isDefault ? "Default" : ""}
        </div>
      </div>
    </div>
  );

  const SymbolItem = ({ symbol }) => (
    <div
      className={`currency-symbol-item ${selectedSymbol === symbol.symbol ? 'currency-selected-symbol-item' : ''}`}
      onClick={() => {
        setSelectedSymbol(symbol.symbol);
        closeSymbolModal();
      }}
    >
      <div className="currency-symbol-text">{symbol.symbol}</div>
      <div className="currency-symbol-name">{symbol.name}</div>
      {selectedSymbol === symbol.symbol && (
        <span className="currency-checkmark">✓</span>
      )}
    </div>
  );

  const BaseCurrencyItem = ({ currency }) => (
    <div
      className={`currency-base-item ${selectedBaseCurrency?.id === currency.id ? 'currency-selected-base-item' : ''}`}
      onClick={() => handleSelectBaseCurrency(currency)}
    >
      <div className="currency-symbol-container">
        <div className="currency-symbol">{currency.symbol}</div>
      </div>
      <div className="currency-details">
        <div className="currency-name">{currency.name}</div>
        <div className="currency-code">{currency.code}</div>
        <div className="currency-rate">
          Base Rate: {currency.rate} {currency.symbol}
        </div>
      </div>
      {selectedBaseCurrency?.id === currency.id && (
        <div className="currency-base-badge">
          <span className="currency-base-checkmark">✓</span>
          <div className="currency-base-badge-text">Base</div>
        </div>
      )}
    </div>
  );

  const CreateCurrencyModal = () => (
    <div className="currency-modal-overlay">
      <div 
        className="currency-modal-container"
        style={{
          opacity: fadeAnim,
          transform: `translateY(${slideAnim}px)`
        }}
      >
        <div className="currency-modal-header">
          <div className="currency-modal-title">
            {editingCurrency ? "Edit Currency" : "Create Currency"}
          </div>
          <button
            onClick={closeCreateModal}
            className="currency-close-button"
          >
            <span className="currency-close-icon">✕</span>
          </button>
        </div>

        <div className="currency-modal-content">
          <div className="currency-symbol-selector" onClick={openSymbolModal}>
            <div className="currency-symbol-selector-label">
              Currency Symbol
            </div>
            <div className="currency-symbol-selector-value">
              <div className="currency-selected-symbol-text">
                {selectedSymbol || "Select Symbol"}
              </div>
              <span className="currency-chevron-down">▼</span>
            </div>
          </div>

          <div className="currency-input-container">
            <div className="currency-input-label">Currency Name</div>
            <input
              className="currency-text-input"
              placeholder="e.g., United States Dollar"
              value={currencyName}
              onChange={(e) => setCurrencyName(e.target.value)}
            />
          </div>

          <div className="currency-input-container">
            <div className="currency-input-label">
              Exchange Rate (relative to base currency)
            </div>
            <input
              className="currency-text-input"
              placeholder="e.g., 1.0"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              type="number"
            />
          </div>

          <div className="currency-modal-actions">
            <button
              className="currency-cancel-button"
              onClick={closeCreateModal}
            >
              Cancel
            </button>
            <button
              className={`currency-create-button ${
                (!selectedSymbol || !currencyName.trim() || !exchangeRate.trim()) ? 'currency-create-button-disabled' : ''
              }`}
              onClick={handleCreateCurrency}
              disabled={!selectedSymbol || !currencyName.trim() || !exchangeRate.trim()}
            >
              {editingCurrency ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

const SymbolModal = () => {
  // Use useMemo to prevent re-renders on search
  const filteredSymbols = React.useMemo(() => {
    if (searchQuery.trim() === "") {
      return CURRENCY_SYMBOLS;
    }
    return CURRENCY_SYMBOLS.filter(
      (item) =>
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="currency-modal-overlay">
      <div 
        className="currency-symbol-modal-container"
        style={{
          opacity: fadeAnim,
          transform: `translateY(${slideAnim}px)`
        }}
      >
        <div className="currency-modal-header">
          <div className="currency-modal-title">Select Currency Symbol</div>
          <button
            onClick={closeSymbolModal}
            className="currency-close-button"
          >
            <span className="currency-close-icon">✕</span>
          </button>
        </div>

        <div className="currency-symbol-modal-content">
          <div className="currency-search-container">
            <span className="currency-search-icon">🔍</span>
            <input
              className="currency-search-input"
              placeholder="Search symbols or names..."
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <button 
                onClick={handleClearSearch}
                className="currency-clear-search-button"
                type="button"
              >
                ✕
              </button>
            )}
          </div>

          <div className="currency-symbols-list-container">
            {filteredSymbols.length === 0 ? (
              <div className="currency-no-symbols-found">
                <span className="currency-search-icon-large">🔍</span>
                <div className="currency-no-symbols-text">
                  No currency symbols found
                </div>
                <div className="currency-no-symbols-subtext">
                  Try searching with different terms
                </div>
              </div>
            ) : (
              <div className="currency-symbols-scrollable">
                {filteredSymbols.map((symbol) => (
                  <SymbolItem key={symbol.code} symbol={symbol} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

  const BaseCurrencyModal = () => (
    <div className="currency-modal-overlay">
      <div 
        className="currency-base-modal-container"
        style={{
          opacity: fadeAnim,
          transform: `translateY(${slideAnim}px)`
        }}
      >
        <div className="currency-modal-header">
          <div className="currency-modal-title">Select Base Currency</div>
          <button
            onClick={closeBaseCurrencyModal}
            className="currency-close-button"
          >
            <span className="currency-close-icon">✕</span>
          </button>
        </div>

        <div className="currency-modal-content">
          <div className="currency-modal-description">
            Base currency will be used as the default system payment currency
            throughout the system.
          </div>
        </div>

        <div className="currency-base-list">
          {currencies.map((currency) => (
            <BaseCurrencyItem key={currency.id} currency={currency} />
          ))}
        </div>
      </div>
    </div>
  );

  const ProcessingModal = () => (
    <div className="currency-processing-overlay">
      <div className="currency-processing-container">
        <div className="currency-processing-spinner"></div>
        <div className="currency-processing-text">
          {editingCurrency ? "Updating Currency..." : "Creating Currency..."}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`app-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <TopToolbar
        title="Currency Management"
        subtitle="Create and manage currencies"
        companyName={user?.company_name || "Company"}
        onMenuToggle={() => setSidebarCollapsed(false)}
        isLoading={loading}
      />
      
      <SideNav
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="currency-container">
          <div className="currency-content">
            {/* Header */}
            <div className="currency-header">
              <div className="currency-header-content">
                <button className="currency-back-button" onClick={() => navigate(-1)}>
                  <span className="currency-back-icon">←</span>
                  Back
                </button>
                
                <div className="currency-header-title-container">
                  <div className="currency-header-title">Currency Management</div>
                  <div className="currency-header-subtitle">
                    Create and manage currencies
                  </div>
                </div>
                    {/* Floating Action Button */}
        <button
          className="currency-fab"
          onClick={openCreateModal}
        >
          <span className="currency-fab-icon">+</span>
        </button>
              </div>
            </div>

            <div className="currency-scroll-content">
              {/* Currency List */}
              <div className="currency-section">
                <div className="currency-section-title">Your Currencies</div>

                {loading ? (
                  <div className="currency-empty-state">
                    <div className="currency-loading-text">Loading currencies...</div>
                  </div>
                ) : currencies.length === 0 ? (
                  <div className="currency-empty-state">
                    <span className="currency-empty-icon">💰</span>
                    <div className="currency-empty-state-text">
                      No currencies created yet
                    </div>
                    <div className="currency-empty-state-subtext">
                      Tap the + button to create your first currency
                    </div>
                  </div>
                ) : (
                  <div className="currency-list">
                    {currencies.map((currency) => (
                      <CurrencyItem key={currency.id} currency={currency} />
                    ))}
                  </div>
                )}
              </div>

              {/* Base Currency Section */}
              <div className="currency-base-section">
                <div className="currency-section-title">Base Currency</div>
                <div className="currency-section-subtitle">
                  Select which currency to use as reference for all exchange rates
                </div>

                {currencies.length > 0 ? (
                  <button
                    className="currency-base-selector"
                    onClick={openBaseCurrencyModal}
                  >
                    <div className="currency-base-info">
                      <div className="currency-base-symbol-container">
                        <div className="currency-base-symbol">
                          {selectedBaseCurrency?.symbol || currencies[0]?.symbol || "$"}
                        </div>
                      </div>
                      <div className="currency-base-details">
                        <div className="currency-base-name">
                          {selectedBaseCurrency?.name || currencies[0]?.name || "Select Currency"}
                        </div>
                        <div className="currency-base-code">
                          {selectedBaseCurrency?.code || currencies[0]?.code || "USD"} (Base Currency)
                        </div>
                      </div>
                    </div>
                    <span className="currency-chevron-forward">›</span>
                  </button>
                ) : (
                  <div className="currency-no-currencies-message">
                    <span className="currency-warning-icon">⚠️</span>
                    <div className="currency-no-currencies-text">
                      No currencies available to set as base
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

    

        {/* Modals */}
        {modalVisible && <CreateCurrencyModal />}
        {symbolModalVisible && <SymbolModal />}
        {baseCurrencyModalVisible && <BaseCurrencyModal />}
        {processing && <ProcessingModal />}
      </div>
    </div>
  );
};

export default CreateCurrencyScreen;