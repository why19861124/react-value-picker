import React from 'react';
import BaseComponent from 'base-component';
import Service from 'service';
import * as DataHelper from './picker-data-helper';
import '../assets/index.scss';

function pickerItem(props, key, isFocus) {
  let _className = [
    'picker-col',
    isFocus ? 'picker-col--focus' : '',
    props.isSmall ? 'picker-col--small' : '',
  ].filter(Boolean).join(' ');
  // TODO: check values has 3 value
  return (
    <div className={_className} key={key}>
      {
        props.data.map(
          (item, _index) => (
            <div className="picker-grid" key={item ? item : _index}>{item}</div>
          )
        )
      }
    </div>
  );
};

export default class Picker extends BaseComponent {
  name = 'Picker';

  initState = { oriColumns: null };
  YEAR_COL_INDEX = 2;
  MONTH_COL_INDEX = 0;
  DAY_COL_INDEX = 1;

  constructor(props) {
    super(props);
    this.state = this.initState;

    Service.register('init', this);
    Service.register('navigate', this);
    Service.register('exit', this);
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.type) { return; }
    this.init(nextProps);
  }

  filterRow = (source) => {
    let focusIndex = Math.min(source.data.length - 1, source.index);
    return {
      ...source,
      data: [
        source.data[focusIndex - 1],
        source.data[focusIndex],
        source.data[focusIndex + 1] // this maybe undefined
      ]
    };
  };

  init(option) {
    let info = DataHelper.generateData(option);
    info.focusCol = 0;
    this.setState(info);
  }

  getValue() {
    let value = DataHelper.formater(this.state);
    this.exit();
    return value;
  }

  exit() {
    this.setState(this.initState);
  }

  select() {
    this.exit();
  }

  adjustValue(dir) { // dir: 1(down), -1(up)
    this.setState((prevState) => {
      let _column = prevState.oriColumns[prevState.focusCol];

      _column.index = (_column.index + dir + _column.data.length) % _column.data.length;

      if ('date' === prevState.type) {
        // need to update days column if year or month changed
        if (this.DAY_COL_INDEX !== prevState.focusCol) {
          let _date = prevState.oriColumns.map((col) => col.index);
          let _newDays = DataHelper.generateDaysFromMonth({ year: _date[2] + 1970, month: _date[0] + 1 });
          let _maxIndex = _newDays.length - 1;
          let daysCol = prevState.oriColumns[1];
          daysCol.data = _newDays;

          if (daysCol.index > _maxIndex) {
            daysCol.index = _maxIndex;
          }
        }
      }

      return prevState;
    });
  }

  switchCol(dir) {
    this.setState((prevState) => {
      let columnLenth = this.columns.length;
      prevState.focusCol = (prevState.focusCol + dir + columnLenth) % columnLenth;
      return prevState;
    });
  }

  navigate(key) {
    switch (key) {
      case 'ArrowLeft':
        this.switchCol(-1);
        break;
      case 'ArrowRight':
        this.switchCol(1);
        break;
      case 'ArrowUp':
        this.adjustValue(-1);
        break;
      case 'ArrowDown':
        this.adjustValue(1);
        break;
      default:
        break;
    }
  }

  setRef = (node) => {
    this.element = node;
  };

  render() {
	dump("senwa this.state.type = " + this.state.type);
    if (!this.state.oriColumns) {
      return null;
    }
    this.columns = this.state.oriColumns.map(this.filterRow);
    return (
      <div
        id="picker" tabIndex="-1"
        className="picker-root"
        ref={this.setRef}
      >
		<h1 className="picker-title h1" data-l10n-id={`select-${this.state.type}`}></h1>
        <div className="picker-wall">
          {
            this.columns.map((item, key) => {
              return pickerItem(item, key, this.state.focusCol === key);
            })
          }
        </div>
      </div>
    );
  }
}
