import _ from 'lodash';

export const KEY_DELIMITER = '.';
export const ROOT_KEY = 'ROOT_KEY';

function _localeParse(localeData, localeName, level, parentId) {
  const parsedData = {};

  let keys = Object.keys(localeData);
  let self = this;
  keys.forEach((key) => {
    let data = localeData[key];
    const id = `${parentId}${KEY_DELIMITER}${key}`;
    if (_.isObject(localeData[key])) {
      parsedData[key] = {
        id,
        meta: {
          collapse: true,
          type: 'NODE',
          level,
        },
        value: _localeParse(localeData[key], localeName, level + 1, id)
      };
    } else {
      parsedData[key] = {
        id,
        meta: {
          type: 'LEAF',
          level,
        },
        value: {
          [localeName]: data
        }
      };
    }
  });

  return parsedData;
}

export function localeParse(localeData, localeName) {
  const ROOT_ID = ROOT_KEY;
  const ROOT_LEVEL = 0;
  return {
    id: ROOT_KEY,
    meta: {
      collapse: false,
      type: 'NODE',
      level: 0
    },
    value: _localeParse(localeData, localeName, ROOT_LEVEL + 1, ROOT_ID)
  };
}

export function _localeSerializer(nodeValue, localeName) {
  const localeData = {};

  _.each(_.keys(nodeValue), (key) => {
    if (nodeValue[key].meta.type === 'LEAF') {
      localeData[key] = (nodeValue[key].value)[localeName] !== undefined ?
        (nodeValue[key].value)[localeName] : '';
    } else {
      localeData[key] = _localeSerializer(nodeValue[key].value, localeName);
    }
  });

  return localeData;
}

export function localeSerializer(node, localeName) {
  return _localeSerializer(node.value, localeName);
}

function nodeTraversal(idFragments, masterStructure) {
  let node = masterStructure;
  for (let i = 1; i < idFragments.length; i++) {
    try {
      node = (node.value)[idFragments[i]];
    } catch (e) {
      return null;
    }
  }
  return node;
}

export function findNode(id, masterStructure) {
  const idFragments = id.split(KEY_DELIMITER);
  const value = nodeTraversal(idFragments, masterStructure);
  return value;
}

export function findNodeParent(id, masterStructure) {
  if (id === ROOT_KEY) {
    // Root has no parent
    return null;
  }
  const idFragments = _.initial(id.split(KEY_DELIMITER));
  const value = nodeTraversal(idFragments, masterStructure);
  return value;
}

export function createNewNode(parentNode, newKey) {
  const node = _.cloneDeep(parentNode);
  const id = node.id;
  const level = node.meta.level;
  return {
    id: `${id}${KEY_DELIMITER}${newKey}`,
    meta: {
      type: 'LEAF',
      level: level + 1
    },
    value: {}
  };
}

export function updateNodeKeys(oldNode, newKey, level) {
  const node = _.cloneDeep(oldNode);
  const nodeLevel = level || node.meta.level;
  const idFragments = node.id.split(KEY_DELIMITER);
  idFragments[nodeLevel] = newKey;
  node.id = idFragments.join(KEY_DELIMITER);
  if (node.meta.type === 'NODE') {
    _.each(_.keys(node.value), (key) => {
      (node.value)[key] = updateNodeKeys((node.value)[key], newKey, nodeLevel);
    });
  }
  return node;
}
