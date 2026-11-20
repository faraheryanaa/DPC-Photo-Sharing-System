
function SearchFilters({
  search,
  uploader,
  selectedDate,
  uploaders,
  onSearchChange,
  onUploaderChange,
  onDateChange,
  onClear
}) {
  return (
    <div className="photo-filters">
      <input
        type="search"
        placeholder="search photos or captions..."
        aria-label="Search photos"
        value={search}
        onChange={(event) =>
          onSearchChange(event.target.value)
        }
      />

      <select
        value={uploader}
        onChange={(event) =>
          onUploaderChange(event.target.value)
        }
        aria-label="Filter by uploader"
      >
        <option value="all">all uploaders</option>

        {uploaders.map((name) => (
          <option key={name} value={name}>
            @{name}
          </option>
        ))}
      </select>

      <input
        type="date"
        aria-label="Filter photos by date"
        value={selectedDate}
        onChange={(event) =>
          onDateChange(event.target.value)
        }
      />

      <button
        type="button"
        className="clear-filters-btn"
        onClick={onClear}
      >
        clear filters
      </button>
    </div>
  );
}

export default SearchFilters;
