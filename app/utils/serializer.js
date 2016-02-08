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
        collapse: false,
        type: 'NODE',
        level,
        value: localeParse(localeData[key], localeName, level + 1, id)
      };
    } else {
      parsedData[key] = {
        id,
        type: 'LEAF',
        level,
        value: {
          [localeName]: data
        }
      };
    }
  });

  return parsedData;
}
