import React, { Component } from 'react';
import { Link } from 'react-router';
import _ from 'lodash';
import classnames from 'classnames';

const KEY_DELIMITER = ' > ';

export default class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      locales: {},
      masterFormat: [],
      hiddenKeys: {}
    };
  }

  processFile(obj, parentKey = '', masterFormat = []) {
    let keys = Object.keys(obj);
    let self = this;
    keys.forEach((key) => {
      const currentKey = (parentKey === '' ? key : `${parentKey}${KEY_DELIMITER}${key}`);

      if (typeof obj[key] === 'object') {
        if (masterFormat.indexOf(currentKey) < 0) {
          masterFormat.push(currentKey);
        }
        masterFormat = self.processFile(obj[key], currentKey, masterFormat);
      } else if (typeof obj[key] === 'string' && masterFormat.indexOf(currentKey) < 0) {
        masterFormat.push(currentKey);
      }
    });

    return masterFormat;
  }

  getRowMode(key) {
    let keyHidden = 'SHOW';
    if (this.state.hiddenKeys.hasOwnProperty(key)) {
      return 'COLLAPSED';
    }
    _.each(Object.keys(this.state.hiddenKeys), ((hiddenKey) => {
      if (key.indexOf(hiddenKey) > -1) {
        keyHidden = 'HIDDEN';
        return false;
      }
    }));
    return keyHidden;
  }

  renderTableBodyRows() {
    const tableBodyRows = [];
    _.each(this.state.masterFormat, ((key) => {
      const rowMode = this.getRowMode(key);
      switch (rowMode) {
        case 'SHOW':
        case 'COLLAPSED':
          tableBodyRows.push(this.renderRow(key, rowMode));
          break;
      }
    }));
    return (
      <tbody>{tableBodyRows}</tbody>
    );
  }

  renderRow(key, rowMode) {
    const anyLocale = Object.keys(this.state.locales)[0];
    const value = this.getValueForKey(this.state.locales[anyLocale].data, key);
    const shouldShowChevron = !value;
    return (
      <tr>
        <td>{this.formatKey(key, rowMode, shouldShowChevron)}</td>
        {Object.keys(this.state.locales).map((locale) => {
          return (
            <td>
              {rowMode === 'SHOW' ?
                this.getValueForKey(this.state.locales[locale].data, key) : null
              }
            </td>
          );
        })}
      </tr>
    );
  }

  formatKey(key, rowMode, shouldShowCaret) {
    let levelKeys = key.split(KEY_DELIMITER);
    let str = '';
    return (
      <span onClick={this.toggleKey.bind(this, key)}>
        {_.map(_.range(levelKeys.length - 1), (i) => {
          return <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;</span>
        })}
        {shouldShowCaret ? <i className={classnames('ln-caret fa fa-lg', {
          'fa-caret-down': rowMode === 'SHOW',
          'fa-caret-right': rowMode === 'COLLAPSED'
        })}/> : null}
        &nbsp;{levelKeys[levelKeys.length - 1]}
      </span>
    );
  }

  toggleKey(key) {
    const hiddenKeys = this.state.hiddenKeys;
    if (hiddenKeys.hasOwnProperty(key)) {
      delete hiddenKeys[key];
    } else {
      hiddenKeys[key] = true;
    }
    this.setState({
      hiddenKeys: hiddenKeys
    });
  }

  getValueForKey(localeFileData, key) {
    let levelKeys = key.split(KEY_DELIMITER);
    let value = localeFileData;
    levelKeys.forEach((levelKey) => {
      try {
        value = value[levelKey];
      } catch (e) {
        return null;
      }
    });
    return typeof value !== 'object' ? value : null;
  }

  fileChangeHandler(event) {
    const files = event.target.files;
    const locales = this.state.locales;
    const self = this;

    Object.keys(files).forEach((key) => {
      const path = files[key].path;
      let localeObject = {
        name: files[key].name,
        path: files[key].path,
        file: files[key],
        data: null
      };

      if (true || files[key].type === 'application/json') {
        locales[path] = localeObject;
      } else {
        alert("File must be of JSON format!");
      }

      const reader = new FileReader();
      reader.onloadend = (e) => {
        const fileData = JSON.parse(e.target.result);
        localeObject.data = fileData;
        var masterFormat = self.processFile(fileData);
        var combinedMasterFormat = _.union(self.state.masterFormat, masterFormat);
        combinedMasterFormat.sort();
        self.setState({
          masterFormat: combinedMasterFormat
        });
      }

      reader.readAsText(files[key]);
    });

    this.setState({
      locales: locales
    }, () => console.log(this.state.locales));
  }

  render() {
    return (
      <div>
        <div className="container">
          <input type="file" multiple onChange={this.fileChangeHandler.bind(this)}/>
        </div>
        <table className="table">
          <colgroup>
            <col className="locale-key"/>
          </colgroup>
          <thead>
            <tr>
              <th>Key</th>
              {Object.keys(this.state.locales).map((locale) => {
                return (
                  <th>{this.state.locales[locale].name}</th>
                );
              })}
            </tr>
          </thead>
          {this.renderTableBodyRows()}
        </table>

      </div>
    );
  }
}
