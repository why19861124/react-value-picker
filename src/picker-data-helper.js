const BASE_YEAR = 1970;

const MIN_DATE = '1970-01-01';
const MAX_DATE = '2035-12-31';
const MIN_TIME = '00:00';
const MAX_TIME = '23:59';
const TIME_PATTERN = /^([0-1][0-9]|2[0-3])(:[0-5][0-9]){1,2}$/;
const DATE_PATTERN = /^[0-9]{4}-(0[1-9]|1[012])-(0[1-9]|1[0-9]|2[0-9]|3[01])$/;

const splitDateTime = (dateTimeString, splitChar = '-') => {
  return dateTimeString.split(splitChar).map(Number);
};

const leadingZeros = (string, digit = 2) => {
  return String(string).padStart(digit, '0');
};

const generateArray = (start = 0, end = 0, padLeftZeroCount) => {
  let arr = [...Array(end + 1).keys()].slice(start);
  if (padLeftZeroCount) {
    arr = arr.map((i) => leadingZeros(i, padLeftZeroCount));
  }
  return arr;
};

const getDateTime = (timestamp = new Date()) => {
  let time = new Date(timestamp);
  return {
    value: time,
    year: time.getFullYear(),
    month: time.getMonth() + 1,
    date: time.getDate(),
    hour: time.getHours(),
    minute: time.getMinutes(),
    isAm: time.getHours() < 12
  };
};

const generateDaysFromMonth = ({ year = BASE_YEAR, month = 0 } = {}) => {
  return oriValue.days.slice(0, new Date(year, month, 0).getDate());
}

const oriValue = {
  days: generateArray(1, 31, 2),
  minutes: generateArray(0, 59, 2),
  hours12: generateArray(1, 12, 2),
  hours24: generateArray(1, 24, 2),
};

// hard code
oriValue.hours24[23] = '00';

navigator.mozL10n.ready(() => {
  oriValue.monthsInShort = (() => {
    let dateTimeFormat = navigator.mozL10n.DateTimeFormat();
    return generateArray(0, 11).map((v, i) => {
      let date = new Date(BASE_YEAR, i, 1);
      return dateTimeFormat.localeFormat(date, '%b');
    })
  })();

  oriValue.ampm = (() => {
    let dateTimeFormat = navigator.mozL10n.DateTimeFormat();
    return [
      new Date(`${BASE_YEAR}-01-01T01:00`),
      new Date(`${BASE_YEAR}-01-01T23:00`)
    ].map((_date) => dateTimeFormat.localeFormat(_date, '%p'));
  })();
});

const getColValue = (col, amPm) => {
  let output = col.index;
  switch (col.name) {
    case 'years':
      output = col.offset + col.index;
      break;
    case 'months':
    case 'days':
      output = col.offset + col.index + 1;
      break;
    case 'hours':
      output = col.data[col.index] * 1;
      if (12 === output) {
        if (amPm && !amPm.index) {
          output = 0;
        }
      } else if (amPm && amPm.index) {
        output += 12;
      }
      break;
    default:
      break;
  }
  return output;
};

const sortByOrder = (a, b) => (a.formatOrder - b.formatOrder);

export const formater = (state) => {
  let splitChar;
  let amPm;
  if ('date' === state.type) {
    splitChar = '-';
  } else if ('time' === state.type) {
    splitChar = ':';
    amPm = state.oriColumns[2];
  }

  let formateData = state.oriColumns
    .filter((i) => -1 !== i.formatOrder)
    .sort(sortByOrder)
    .map((col) => getColValue(col, amPm))
    .map((value) => leadingZeros(value));
  return formateData.join(splitChar);
};

export { generateDaysFromMonth };

const normalizeValue = (option) => {
  let _pattern;
  let _fromater;
  let min;
  let max;

  switch (option.type) {
    case 'time':
      _pattern = TIME_PATTERN;
      _fromater = [['hour', 'minute'], ':'];
      min = MIN_TIME;
      max = MAX_TIME;
      break;
    case 'date':
      _pattern = DATE_PATTERN;
      _fromater = [['year', 'month', 'date'], '-'];
      min = MIN_DATE;
      max = MAX_DATE;
      break;
    default:
      return false;
      break;
  }

  if (_pattern.test(option.min)) { min = option.min; }
  if (_pattern.test(option.max)) { max = option.max; }

  let value = _pattern.test(option.value) ? option.value : (
    _dateTime => _fromater[0].map(i => leadingZeros(_dateTime[i])).join(_fromater[1])
  )(getDateTime(new Date()));

  if (value > max) { value = max; }
  if (value < min) { value = min; }

  return {
    type: option.type,
    min: min,
    max: max,
    value,
  };
};

export { normalizeValue };
export { getDateTime };

export function generateData(option) {
  /**
    option: {
      type: 'time' || 'date',
      value: '13:40' || '2013-04-15'
    }
   */
  let normalizedValue = normalizeValue(option);
  if (!normalizedValue) {
    return;
  }

  let ouputData = {
    type: option.type
  };

  let dateTime;

  switch (option.type) {
    case 'time':
      dateTime = getDateTime(new Date(`${BASE_YEAR}-01-01T${normalizedValue.value}`));

      let hoursData = (navigator.mozHour12 ? oriValue.hours12 : oriValue.hours24).sort();
      let _hour = normalizedValue.value.slice(0, 2);

      if (navigator.mozHour12 && _hour > '12') {
        _hour = leadingZeros(_hour - 12);
      }

      ouputData.oriColumns = [
        {
          name: 'hours',
          formatOrder: 3,
          data: hoursData,
          index: (navigator.mozHour12 && _hour === '00') ? 11 : hoursData.indexOf(_hour),
        },
        {
          name: 'minutes',
          formatOrder: 4,
          data: oriValue.minutes,
          index: dateTime.minute,
        }
      ];

      if (navigator.mozHour12) {
        ouputData.oriColumns.push({
          name: 'ampm',
          formatOrder: -1,
          data: oriValue.ampm,
          index: dateTime.isAm ? 0 : 1,
          isSmall: true,
        });
      }

      break;

    case 'date':
      let [year, month, day] = splitDateTime(normalizedValue.value, '-');
      dateTime = getDateTime(new Date(year, +month - 1, day));

      let [minYear, minMonth, minDay] = splitDateTime(normalizedValue.min, '-');
      let [maxYear, maxMonth, maxDay] = splitDateTime(normalizedValue.max, '-');

      let sameYear = (minYear === maxYear);
      let sameMonth = (minMonth === maxMonth);

      let offsetMonth = sameYear ? minMonth - 1 : 0;
      let offsetDay = (sameYear && sameMonth) ? minDay - 1 : 0;
      let daysData = generateDaysFromMonth({ year: dateTime.year, month: dateTime.month});

      ouputData.oriColumns = [
        {
          name: 'months',
          formatOrder: 1,
          data: sameYear
            ? oriValue.monthsInShort.slice(minMonth - 1, maxMonth)
            : oriValue.monthsInShort,
          offset: offsetMonth,
          index: dateTime.month - 1 - offsetMonth,
          isSmall: true,
        },
        {
          name: 'days',
          formatOrder: 2,
          data: (sameYear && sameMonth) ? daysData.slice(minDay - 1, maxDay) : daysData,
          offset: offsetDay,
          index: dateTime.date - 1 - offsetDay
        },
        {
          name: 'years',
          formatOrder: 0,
          data: generateArray(minYear, maxYear),
          offset: minYear,
          index: dateTime.year - minYear,
          isSmall: true,
        }
      ];
      break;
    default:
      break;
  }
  return ouputData;
}
