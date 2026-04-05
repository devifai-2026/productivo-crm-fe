import { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { locationAPI } from '../../services/api';

const LOCATIONIQ_KEY = 'pk.d834e6dedfba17aa6c9e976b6843fee8';

// ─── Searchable dropdown ──────────────────────────────────────────────────────
function SearchableDropdown({ label, placeholder, value, options, onSelect, loading, disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keep the text box in sync when value is changed externally (e.g. edit mode)
  useEffect(() => { setQuery(value || ''); }, [value]);

  const filtered = query.length > 0
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())).slice(0, 80)
    : options.slice(0, 80);

  const baseCls = `w-full rounded-xl border bg-white dark:bg-gray-900 px-4 py-2.5 text-sm
    text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all
    ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700'}`;

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => !disabled && setOpen(true)}
          className={baseCls}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading
            ? <Icon icon="lucide:loader-2" className="w-3.5 h-3.5 text-gray-400 animate-spin" />
            : <Icon icon="lucide:chevron-down" className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </div>
      {open && !disabled && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={() => { onSelect(opt); setQuery(opt); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20
                ${value === opt
                  ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50/60 dark:bg-blue-900/10'
                  : 'text-gray-700 dark:text-gray-300'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {open && !disabled && filtered.length === 0 && query.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
          No results
        </div>
      )}
    </div>
  );
}

// ─── AddressSearch ────────────────────────────────────────────────────────────
/**
 * Props:
 *   value         – { street, city, state, zipCode, lat, lng }
 *   onChange      – (fields) => void
 *   isDummy       – boolean
 *   onDummyChange – (bool) => void
 */
export default function AddressSearch({ value = {}, onChange, isDummy = false, onDummyChange }) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const stateMapRef = useRef({});

  // Autocomplete
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const streetWrapperRef = useRef(null);

  // Load states once on mount
  useEffect(() => {
    setLoadingStates(true);
    locationAPI.getStates()
      .then((res) => {
        const data = res.data?.data || [];
        stateMapRef.current = Object.fromEntries(data.map((s) => [s.name, s.iso2]));
        setStates(data.map((s) => s.name));
      })
      .catch(() => {})
      .finally(() => setLoadingStates(false));
  }, []);

  // Load cities whenever state changes
  useEffect(() => {
    if (!value.state) { setCities([]); return; }
    const iso2 = stateMapRef.current[value.state];
    if (!iso2) { setCities([]); return; }
    setLoadingCities(true);
    locationAPI.getCities(iso2)
      .then((res) => setCities(res.data?.data || []))
      .catch(() => setCities([]))
      .finally(() => setLoadingCities(false));
  }, [value.state]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (streetWrapperRef.current && !streetWrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const url = `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&limit=6&dedupe=1`;
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);
  }, []);

  const handleSuggestionSelect = useCallback((item) => {
    const addr = item.address || {};
    const street = [addr.house_number, addr.road || addr.street || addr.pedestrian]
      .filter(Boolean).join(' ') || item.display_name?.split(',')[0] || '';
    const city = addr.city || addr.town || addr.village || addr.suburb || '';
    const state = addr.state || '';
    const zipCode = addr.postcode || '';
    const lat = item.lat ? parseFloat(item.lat) : null;
    const lng = item.lon ? parseFloat(item.lon) : null;
    onChange({ street, city, state, zipCode, lat, lng });
    setSuggestions([]);
    setShowSuggestions(false);
  }, [onChange]);

  const hasCoords = !isDummy && value.lat && value.lng;
  const mapSrc = hasCoords
    ? `https://maps.locationiq.com/v3/staticmap?key=${LOCATIONIQ_KEY}&center=${value.lat},${value.lng}&zoom=14&size=600x200&markers=icon:small-red-cutout|${value.lat},${value.lng}`
    : null;

  const inputCls = `w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
    px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`;

  return (
    <div className="space-y-3">
      {/* Dummy toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer w-fit select-none">
        <div
          onClick={() => onDummyChange?.(!isDummy)}
          className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${isDummy ? 'bg-amber-400' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isDummy ? 'left-4' : 'left-0.5'}`} />
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {isDummy ? 'Address unknown — using dummy' : "I don't know the address"}
        </span>
      </label>

      {isDummy ? (
        <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3 flex items-center gap-2.5">
          <Icon icon="lucide:map-pin-off" className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-400">No address — a placeholder will be used</span>
        </div>
      ) : (
        <>
          {/* Street with autocomplete */}
          <div ref={streetWrapperRef} className="relative">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Street / Flat / Area</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search address (e.g. MG Road, Kolkata)"
                value={value.street || ''}
                onChange={(e) => {
                  onChange({ ...value, street: e.target.value });
                  fetchSuggestions(e.target.value);
                }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                className={`${inputCls} pr-8`}
                autoComplete="off"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {loadingSuggestions
                  ? <Icon icon="lucide:loader-2" className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                  : value.street
                    ? <button
                        type="button"
                        className="pointer-events-auto"
                        onMouseDown={(e) => { e.preventDefault(); onChange({ ...value, street: '' }); setSuggestions([]); setShowSuggestions(false); }}
                      >
                        <Icon icon="lucide:x" className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                      </button>
                    : <Icon icon="lucide:search" className="w-3.5 h-3.5 text-gray-400" />
                }
              </div>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-gray-900 rounded-xl border border-blue-400 dark:border-blue-600 shadow-lg">
                {suggestions.map((item, idx) => {
                  const parts = (item.display_name || '').split(',');
                  const mainText = parts.slice(0, 2).join(',').trim();
                  const subText = parts.slice(2).join(',').trim();
                  return (
                    <button
                      key={item.place_id || idx}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(item); }}
                      className="w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <Icon icon="lucide:map-pin" className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{mainText}</div>
                        {subText && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{subText}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* State */}
          <SearchableDropdown
            label="State"
            placeholder={loadingStates ? 'Loading states…' : 'Select state…'}
            value={value.state || ''}
            options={states}
            onSelect={(s) => onChange({ ...value, state: s, city: '' })}
            loading={loadingStates}
            disabled={loadingStates}
          />

          {/* City */}
          <SearchableDropdown
            label="City"
            placeholder={!value.state ? 'Select state first' : loadingCities ? 'Loading cities…' : 'Select city…'}
            value={value.city || ''}
            options={cities}
            onSelect={(c) => onChange({ ...value, city: c })}
            loading={loadingCities}
            disabled={!value.state || loadingCities}
          />

          {/* ZIP */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">PIN / ZIP Code</label>
            <input
              type="text"
              placeholder="e.g. 400001"
              value={value.zipCode || ''}
              onChange={(e) => onChange({ ...value, zipCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              maxLength={6}
              inputMode="numeric"
              className={inputCls}
            />
          </div>

          {/* Map preview */}
          {hasCoords && (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <img
                src={mapSrc}
                alt="Location map"
                className="w-full h-40 object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
