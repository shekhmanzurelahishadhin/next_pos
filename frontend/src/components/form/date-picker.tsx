import { useEffect } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import Label from './Label';
import { CalenderIcon } from '../../icons';
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
};

// the year list shows this many years before and after the year the calendar shows;
// scrolling to the top or bottom of the list adds more years, so there is no limit
const YEARS_AROUND = 50;
const YEARS_MORE = 20;

// one year in the year list; clicking it moves the calendar to that year
function makeYearItem(calendar: flatpickr.Instance, year: number) {
  const item = document.createElement("div");
  item.className = "flatpickr-yearItem";
  item.dataset.year = String(year);
  item.textContent = String(year);
  if (year === calendar.currentYear) {
    item.classList.add("selected");
  }
  item.addEventListener("click", () => {
    calendar.changeYear(year);
    closeYearList(calendar);
  });
  return item;
}

// fill the year list with the years around the year the calendar shows (newest first)
function fillYearList(calendar: flatpickr.Instance, yearList: HTMLElement) {
  yearList.innerHTML = "";
  const shownYear = calendar.currentYear;
  for (let year = shownYear + YEARS_AROUND; year >= shownYear - YEARS_AROUND; year--) {
    yearList.appendChild(makeYearItem(calendar, year));
  }
}

// add more years when the list is scrolled to its top or bottom
function addMoreYears(calendar: flatpickr.Instance, yearList: HTMLElement) {
  const firstItem = yearList.firstElementChild as HTMLElement | null;
  const lastItem = yearList.lastElementChild as HTMLElement | null;
  if (!firstItem || !lastItem) {
    return;
  }

  if (yearList.scrollTop < 20) {
    const newestYear = Number(firstItem.dataset.year);
    const heightBefore = yearList.scrollHeight;
    for (let year = newestYear + 1; year <= newestYear + YEARS_MORE; year++) {
      yearList.insertBefore(makeYearItem(calendar, year), yearList.firstElementChild);
    }
    // keep the same years in view after adding above them
    yearList.scrollTop = yearList.scrollTop + (yearList.scrollHeight - heightBefore);
  }

  if (yearList.scrollTop + yearList.clientHeight > yearList.scrollHeight - 20) {
    const oldestYear = Number(lastItem.dataset.year);
    for (let year = oldestYear - 1; year >= oldestYear - YEARS_MORE; year--) {
      yearList.appendChild(makeYearItem(calendar, year));
    }
  }
}

function openYearList(calendar: flatpickr.Instance) {
  const yearList = calendar.calendarContainer.querySelector(".flatpickr-yearList") as HTMLElement | null;
  if (!yearList) {
    return;
  }
  fillYearList(calendar, yearList);
  yearList.style.display = "block";

  // put the shown year in the middle of the list
  const selectedItem = yearList.querySelector(".flatpickr-yearItem.selected") as HTMLElement | null;
  if (selectedItem) {
    yearList.scrollTop = selectedItem.offsetTop - yearList.clientHeight / 2 + selectedItem.offsetHeight / 2;
  }
}

function closeYearList(calendar: flatpickr.Instance) {
  const yearList = calendar.calendarContainer.querySelector(".flatpickr-yearList") as HTMLElement | null;
  if (yearList) {
    yearList.style.display = "none";
  }
}

// flatpickr shows the year as a small number box; put a year button with a list of years
// in its place, so an old year can be picked at once instead of going back one month at a time
function addYearDropdown(calendar: flatpickr.Instance) {
  const yearBox = calendar.calendarContainer.querySelector(".numInputWrapper") as HTMLElement | null;
  if (!yearBox) {
    return;
  }

  const yearPicker = document.createElement("div");
  yearPicker.className = "flatpickr-yearPicker";

  const yearButton = document.createElement("button");
  yearButton.type = "button";
  yearButton.className = "flatpickr-yearDropdown";
  yearButton.textContent = String(calendar.currentYear);

  const yearList = document.createElement("div");
  yearList.className = "flatpickr-yearList";
  yearList.style.display = "none";

  yearButton.addEventListener("click", () => {
    if (yearList.style.display === "none") {
      openYearList(calendar);
    } else {
      closeYearList(calendar);
    }
  });
  yearList.addEventListener("scroll", () => addMoreYears(calendar, yearList));

  // a click anywhere else in the calendar closes the year list
  calendar.calendarContainer.addEventListener("mousedown", (event) => {
    if (!yearPicker.contains(event.target as Node)) {
      closeYearList(calendar);
    }
  });

  yearPicker.appendChild(yearButton);
  yearPicker.appendChild(yearList);
  yearBox.style.display = "none";
  yearBox.parentNode?.insertBefore(yearPicker, yearBox);
}

// keep the year button on the year the calendar shows (the arrows can move to another year)
function showYearInDropdown(calendar: flatpickr.Instance) {
  const yearButton = calendar.calendarContainer.querySelector(".flatpickr-yearDropdown") as HTMLElement | null;
  if (yearButton) {
    yearButton.textContent = String(calendar.currentYear);
  }
}

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
}: PropsType) {
  useEffect(() => {
    const flatPickr = flatpickr(`#${id}`, {
      mode: mode || "single",
      // calendar is added to <body>, so a modal or table never cuts it off
      static: false,
      position: "auto",
      // month is picked from a dropdown, year from the dropdown added in onReady
      monthSelectorType: "dropdown",
      // the date can also be typed, e.g. 2026-10-01
      allowInput: true,
      dateFormat: "Y-m-d",
      defaultDate,
      onChange,
      onReady: (_dates, _text, calendar) => addYearDropdown(calendar),
      onYearChange: (_dates, _text, calendar) => showYearInDropdown(calendar),
      onOpen: (_dates, _text, calendar) => showYearInDropdown(calendar),
      onClose: (_dates, _text, calendar) => closeYearList(calendar),
    });

    return () => {
      if (!Array.isArray(flatPickr)) {
        flatPickr.destroy();
      }
    };
  }, [mode, onChange, id, defaultDate]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          className="h-9 w-full rounded-md border appearance-none px-3 py-1.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700  dark:focus:border-brand-800"
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}
