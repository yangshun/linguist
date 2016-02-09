import React, { Component } from 'react';
import { Link } from 'react-router';
import _ from 'lodash';
import classnames from 'classnames';
import { KEY_DELIMITER, ROOT_KEY, localeParse, localeSerializer, findNode,
  findNodeParent, createNewNode, updateNodeKeys } from '../utils/serializer';
const { ipcRenderer } = require('electron');

export default class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      locales: {},
      masterStructure: {
        id: ROOT_KEY,
        meta: {
          collapse: false,
          type: 'NODE',
          level: 0
        },
        value: {}
      },
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
    delete (parentNode.value)[_.last(idFragments)];

    this.setState({
      masterStructure,
      addingId: null,
      editingId: null
    }, this.saveToFile);
  }

  addNode(id) {
    const locales = this.state.locales;
    const masterStructure = this.state.masterStructure;
    let node = findNode(id, masterStructure);
    const newKey = this.refs.editingKey.value;
    const nodeValue = node.value;

    if (nodeValue.hasOwnProperty(newKey) &&
      !confirm(`The key "${newKey}" already exists. Overwrite existing value?`)) {
      return;
    }

    nodeValue[newKey] = createNewNode(node, newKey);
    {_.keys(this.state.locales).map((locale) => {
      const localeObject = locales[locale];
      (nodeValue[newKey].value)[localeObject.name] = this.refs[locale].value;
    })};

    this.setState({
      masterStructure: masterStructure,
      addingId: null,
      editingId: null
    }, this.saveToFile);
  }

  updateNode(id) {
    const locales = this.state.locales;

    const masterStructure = this.state.masterStructure;
    let parentNode = findNodeParent(id, masterStructure);

    const idFragments = id.split(KEY_DELIMITER);
    const nodeName = _.last(idFragments);
    const newKeyName = this.refs.editingKey.value;
    const parentNodeValue = parentNode.value;

    if (parentNodeValue[nodeName].meta.type === 'LEAF') {
      {_.keys(this.state.locales).map((locale) => {
        const localeObject = locales[locale];
        (parentNodeValue[nodeName].value)[localeObject.name] = this.refs[locale].value;
      })};
    }

    if (nodeName !== newKeyName) {
      // Key has changed
      if (parentNodeValue.hasOwnProperty(newKeyName) &&
        !confirm(`The key "${newKeyName}" already exists. Overwrite existing value?`)) {
        return;
      }

      parentNodeValue[newKeyName] = parentNodeValue[nodeName];
      delete parentNodeValue[nodeName];
      parentNodeValue[newKeyName] = updateNodeKeys(parentNodeValue[newKeyName], newKeyName);
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
    const isRootNode = data.id === ROOT_KEY;
    let tableCellStyle = null;
    if (!isRootNode) {
      let offset = -1;
      if (isBeingAdded) {
        offset = 1;
      } else if (isBeingEdited) {
        offset = 0;
      }
      tableCellStyle = {
        paddingLeft: 24 * (data.meta.level + offset)
      };
    }

    return (
      <td style={tableCellStyle}>
        {isBeingEdited || isBeingAdded ?
          <input ref="editingKey"
            type="text"
            className="form-control"
            defaultValue={isBeingAdded ? null : key}/>
          :
          <span>
            {isRootNode ? null :
              <i className={classnames('ln-caret fa fa-fw fa-lg', {
                'fa-caret-down': !data.meta.collapse,
                'fa-caret-right': data.meta.collapse,
                'invisible': data.meta.type === 'LEAF'
                })}
                onClick={this.toggleCollapseNode.bind(this, data.id)}/>
            }
            <strong>{key}</strong>
            {data.meta.type === 'NODE' ? ` {${_.keys(data.value).length}}` : null}
          </span>
        }
      </td>
    );
  }

  renderTableRow(key, data, collapse) {
    const isRootNode = data.id === ROOT_KEY;
    return (
      <tr key={data.id} className={collapse ? 'hidden' : null}>
        <td>
          <div className="ls-edit-btns">
            {!isRootNode ?
              <button className="btn btn-xs btn-default ln-row-edit">
                <i className="fa fa-fw fa-lg fa-pencil"
                  onClick={this.modifyNodeMode.bind(this, data.id, 'EDIT')}/>
              </button> : null
            }
            {!isRootNode ?
              <button className="btn btn-xs btn-danger ln-row-edit">
                <i className="fa fa-fw fa-lg fa-trash"
                  onClick={this.removeNode.bind(this, data.id, 'DELETE')}/>
              </button> : null
            }
            {data.meta.type === 'NODE' ?
              <button className="btn btn-xs btn-info ln-row-edit">
                <i className="fa fa-fw fa-lg fa-plus"
                onClick={this.modifyNodeMode.bind(this, data.id, 'ADD')}/>
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
              onClick={isBeingAdded ? this.addNode.bind(this, data.id) : this.updateNode.bind(this, data.id)}>
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

    const renderRow = (key, node, collapse) => {
      const isBeingEdited = node.id === this.state.editingId;
      const isBeingAdded = node.id === this.state.addingId;

      const tableRow = isBeingEdited ? this.renderTableRowForm(key, node, collapse) : this.renderTableRow(key, node, collapse);
      tableBodyRows.push(tableRow);

      if (isBeingAdded) {
        const addingForm = this.renderTableRowForm(key, node, false, true);
        tableBodyRows.push(addingForm);
      }

      if (node.meta.type === 'NODE') {
        _.each(_.keys(node.value).sort(), (key) => {
          renderRow(key, (node.value)[key], node.meta.collapse || collapse);
        });
      }
    }

    renderRow('Object', this.state.masterStructure, false);

    return (
      <tbody>
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
