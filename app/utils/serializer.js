import _ from 'lodash';

export const KEY_DELIMITER = '.';

export function localeParse(localeData, localeName, level = 1, parent = '') {
  const parsedData = {};

  let keys = Object.keys(localeData);
  let self = this;
  keys.forEach((key) => {
    let data = localeData[key];
    const id = parent === '' ? key : `${parent}${KEY_DELIMITER}${key}`;
    if (typeof localeData[key] === 'object') {
      parsedData[key] = {
        id,
        meta: {
          collapse: false,
          type: 'NODE',
          level,
        },
        value: localeParse(localeData[key], localeName, level + 1, id)
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

export function localeSerializer(parsedData, localeName) {
  const localeData = {};

  let keys = Object.keys(parsedData);
  let self = this;
  keys.forEach((key) => {
    if (parsedData[key].meta.type === 'LEAF') {
      localeData[key] = (parsedData[key].value)[localeName];
    } else {
      localeData[key] = localeSerializer(parsedData[key].value, localeName);
    }
  });

  return localeData;
}

function nodeTraversal(idFragments, masterStructure) {
  let value = masterStructure;
  for (let i = 0; i < idFragments.length - 1; i++) {
    try {
      value = value[idFragments[i]].value;
    } catch (e) {
      return null;
    }
  }
  return value;
}

export function findNode(id, masterStructure) {
  const idFragments = id.split(KEY_DELIMITER);
  const value = nodeTraversal(idFragments, masterStructure);
  return value[_.last(idFragments)];
}

export function findNodeParent(id, masterStructure) {
  const idFragments = id.split(KEY_DELIMITER);
  const value = nodeTraversal(idFragments, masterStructure);
  return value;
}

export function updateNodeKeys(oldNode, newKey, level) {
  const node = _.cloneDeep(oldNode);
  const nodeLevel = level || node.meta.level;
  const idFragments = node.id.split(KEY_DELIMITER);
  idFragments[nodeLevel - 1] = newKey;
  console.log(idFragments);
  node.id = idFragments.join(KEY_DELIMITER);
  if (node.meta.type === 'NODE') {
    _.each(_.keys(node.value), (key) => {
      (node.value)[key] = updateNodeKeys((node.value)[key], newKey, nodeLevel);
    });
  }
  console.log('updateNodeKeys', node);
  return node;
}
