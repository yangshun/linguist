import React, { Component } from 'react';
import { Link } from 'react-router';
import _ from 'lodash';
import classnames from 'classnames';
import { localeParse, localeSerializer, KEY_DELIMITER, findNode,
  findNodeParent, addNodeKey, updateNodeKeys } from '../utils/serializer';
const { ipcRenderer } = require('electron');

export default class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      locales: {},
      masterStructure: {},
      addingId: null,
      editingId: null
    };
  }

  componentDidMount() {
    // var home = document.getElementById('home');
    // home.ondragover = function () {
    //   return false;
    // };
    // home.ondragleave = home.ondragend = function () {
    //   return false;
    // };
    // home.ondrop = function (e) {
    //   e.preventDefault();
    //   var file = e.dataTransfer.files[0];
    //   console.log('File you dragged here is', file.path);
    //   return false;
    // };
  }

  toggleCollapseNode(id) {
    const masterStructure = this.state.masterStructure;
    const node = findNode(id, masterStructure);
    node.meta.collapse = !node.meta.collapse;
    this.setState({
      masterStructure
    });
  }

  modifyNodeMode(id, action) {
    this.setState({
      addingId: action === 'ADD' ? id : null,
      editingId: action === 'EDIT' ? id : null,
    });
  }

  removeNode(id) {
    const masterStructure = this.state.masterStructure;
    const parentNode = findNodeParent(id, masterStructure);
    const idFragments = id.split(KEY_DELIMITER);
    delete parentNode[_.last(idFragments)];

    this.setState({
      masterStructure,
      addingId: null,
      editingId: null
    }, this.saveToFile);
  }

  updateNode(id, isBeingAdded) {
    const locales = this.state.locales;

    const masterStructure = this.state.masterStructure;
    let parentNode = findNodeParent(id, masterStructure);
    const idFragments = id.split(KEY_DELIMITER);
    const nodeName = _.last(idFragments);
    const newKeyName = this.refs.editingKey.value;

    if (isBeingAdded) {
      if (parentNode[nodeName].value.hasOwnProperty(newKeyName) &&
        !confirm(`The key "${newKeyName}" already exists. Overwrite existing value?`)) {
        return;
      }

      parentNode[nodeName] = addNodeKey(parentNode[nodeName], newKeyName);
      const node = parentNode[nodeName].value;
      {_.keys(this.state.locales).map((locale) => {
        const localeObject = locales[locale];
        ((parentNode[nodeName].value)[newKeyName].value)[localeObject.name] = this.refs[locale].value;
      })};
    } else {
      if (parentNode[nodeName].meta.type === 'LEAF') {
        {_.keys(this.state.locales).map((locale) => {
          const localeObject = locales[locale];
          (parentNode[nodeName].value)[localeObject.name] = this.refs[locale].value;
        })};
      }

      if (nodeName !== newKeyName) {
        // Key has changed
        if (parentNode.hasOwnProperty(newKeyName) &&
          !confirm(`The key "${newKeyName}" already exists. Overwrite existing value?`)) {
          return;
        }

        parentNode[newKeyName] = parentNode[nodeName];
        delete parentNode[nodeName];
        parentNode[newKeyName] = updateNodeKeys(parentNode[newKeyName], newKeyName);
      }
    }

    this.setState({
      masterStructure: masterStructure,
      addingId: null,
      editingId: null
    }, this.saveToFile);
  }

  saveToFile() {
    const locales = this.state.locales;
    {_.keys(locales).map((locale) => {
      const localeObject = locales[locale];
      const serializedData = localeSerializer(this.state.masterStructure, localeObject.name);
      ipcRenderer.send('save', localeObject.path, serializedData);
    })};
  }

  formatTableKeyCol(key, data, isBeingAdded) {
    const isBeingEdited = this.state.editingId === data.id;
    let offset = -1;
    if (isBeingAdded) {
      offset = 1;
    } else if (isBeingEdited) {
      offset = 0;
    }
    return (
      <td style={{
        paddingLeft: 24 * (data.meta.level + offset)
      }}>
        {isBeingEdited || isBeingAdded ?
          <input ref="editingKey"
            type="text"
            className="form-control"
            defaultValue={isBeingAdded ? null : key}/>
          :
          <span>
            <i className={classnames('ln-caret fa fa-fw fa-lg', {
              'fa-caret-down': !data.meta.collapse,
              'fa-caret-right': data.meta.collapse,
              'invisible': data.meta.type === 'LEAF'
              })}
              onClick={this.toggleCollapseNode.bind(this, data.id)}/>
            <strong>{key}</strong>
            {data.meta.type === 'NODE' ? ` {${_.keys(data.value).length}}` : null}
          </span>
        }
      </td>
    );
  }

  renderTableRow(key, data, collapse) {
    return (
      <tr key={data.id} className={collapse ? 'hidden' : ''}>
        <td>
          <div className="ls-edit-btns">
            <button className="btn btn-xs btn-default ln-row-edit">
              <i className="fa fa-fw fa-lg fa-pencil" onClick={this.modifyNodeMode.bind(this, data.id, 'EDIT')}/>
            </button>
            <button className="btn btn-xs btn-danger ln-row-edit">
              <i className="fa fa-fw fa-lg fa-trash" onClick={this.removeNode.bind(this, data.id, 'DELETE')}/>
            </button>
            {data.meta.type === 'NODE' ?
              <button className="btn btn-xs btn-info ln-row-edit">
                <i className="fa fa-fw fa-lg fa-plus" onClick={this.modifyNodeMode.bind(this, data.id, 'ADD')}/>
              </button> : null
            }
          </div>
        </td>
        {this.formatTableKeyCol(key, data)}
        {data.meta.type === 'NODE' ?
          <td colSpan={_.keys(this.state.locales).length}/> :
          _.keys(this.state.locales).map((locale) => {
            const name = this.state.locales[locale].name;
            return (
              <td key={name}>
                {data.value[name]}
              </td>
            );
          })
        }
      </tr>
    );
  }

  renderTableRowForm(key, data, collapse, isBeingAdded) {
    return (
      <tr key={data.id + 'add'} className={collapse ? 'hidden' : ''}>
        <td>
          <div className="ls-edit-btns">
            <button className="btn btn-xs btn-success ln-row-save"
              onClick={this.updateNode.bind(this, data.id, isBeingAdded)}>
              <i className="fa fa-fw fa-lg fa-check"/>
            </button>
            <button className="btn btn-xs btn-danger ln-row-cancel"
              onClick={this.modifyNodeMode.bind(this, data.id, 'CANCEL')}>
              <i className="fa fa-fw fa-lg fa-ban"/>
            </button>
          </div>
        </td>
        {this.formatTableKeyCol(key, data, isBeingAdded)}
        {data.meta.type === 'LEAF' || isBeingAdded ?
          _.keys(this.state.locales).map((locale) => {
            const name = this.state.locales[locale].name;
            return (
              <td key={name}>
                <textarea ref={locale}
                  type="text"
                  className="form-control"
                  defaultValue={isBeingAdded ? null : data.value[name]}/>
              </td>
            );
          })
          :
          <td colSpan={_.keys(this.state.locales).length}/>
        }
      </tr>
    );
  }

  renderTableBody() {
    const tableBodyRows = [];

    const renderRow = (nodeValue, collapse) => {
      _.each(_.keys(nodeValue).sort(), (key) => {
        const data = nodeValue[key];
        const isBeingEdited = data.id === this.state.editingId;
        const isBeingAdded = data.id === this.state.addingId;
        const tableRow = isBeingEdited ? this.renderTableRowForm(key, data, collapse) : this.renderTableRow(key, data, collapse);
        tableBodyRows.push(tableRow);
        if (isBeingAdded) {
          const addingForm = this.renderTableRowForm(key, data, false, true);
          tableBodyRows.push(addingForm);
        }

        if (data.meta.type === 'NODE') {
          renderRow(data.value, data.meta.collapse || collapse);
        }
      });
    }

    renderRow(this.state.masterStructure, false);

    return (
      <tbody>
        <tr>
          <td>
            <button className="btn btn-xs btn-info ln-row-edit">
              <i className="fa fa-fw fa-lg fa-plus" onClick={this.modifyNodeMode.bind(this, '', 'ADD')}/>
            </button>
          </td>
          <td>
            <strong>Object</strong> {`{${_.keys(this.state.masterStructure).length}}`}
          </td>
          <td colSpan={_.keys(this.state.locales).length}/>
        </tr>
        {tableBodyRows}
      </tbody>
    );
  }

  fileChangeHandler(event) {
    const files = event.target.files;
    const locales = this.state.locales;
    const self = this;

    _.keys(files).forEach((key) => {
      const path = files[key].path;
      const name = files[key].name;
      let localeObject = {
        name,
        path
      };

      if (true || files[key].type === 'application/json') {
        locales[path] = localeObject;
      } else {
        alert("File must be of JSON format!");
      }

      const reader = new FileReader();
      reader.onloadend = (e) => {
        const fileData = JSON.parse(e.target.result);

        const parsedData = localeParse(fileData, name);
        const combinedMasterStructure = _.merge(self.state.masterStructure, parsedData);

        self.setState({
          masterStructure: combinedMasterStructure
        });
      }

      reader.readAsText(files[key]);
    });

    this.setState({
      locales: locales
    });
  }

  render() {
    return (
      <div id="home">
        <div className="container">
          <input type="file" multiple onChange={this.fileChangeHandler.bind(this)}/>
        </div>
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Action</th>
              <th>Key</th>
              {_.keys(this.state.locales).map((locale) => {
                const name = this.state.locales[locale].name;
                return (
                  <th key={name}>{name}</th>
                );
              })}
            </tr>
          </thead>
          {this.renderTableBody()}
        </table>
      </div>
    );
  }
}
