import React from 'react';
import {
  useSafeArea,
  resolvePropsToStyle,
  useStyledSystemPropsResolver,
} from '../hooks/';
import { memoize } from 'lodash';
import get from 'lodash.get';
import merge from 'lodash.merge';
import { View, StyleSheet, Platform } from 'react-native';
import { ColorMode, useColorMode } from '../core';
import { propsFlattener } from '../hooks/useThemeProps/propsFlattener';
import { ITheme, theme } from '../theme';
import { getStyleAndFilteredProps, propConfig } from '../theme/styled-system';
import {
  callPropsFlattener,
  propsSpreader,
} from '../hooks/useThemeProps/usePropsResolution';
import { isEmptyObj } from './isEmptyObj';
import isEmpty from 'lodash.isempty';

window['logger'] = {};
console.batchTime = (key) => {
  const keyValue = window['logger'][key];
  if (keyValue) {
    // keyValue.totalTime = keyValue.totalTime + (Date.now() - keyValue.startTime);
    keyValue.startTime = window.performance.now();
  } else {
    window['logger'][key] = {
      startTime: window.performance.now(),
      totalTime: 0,
    };
  }
};

console.batchTimeEnd = (key) => {
  const keyValue = window['logger'][key];
  if (keyValue) {
    keyValue.totalTime =
      keyValue.totalTime + (window.performance.now() - keyValue.startTime);
    // console.log(
    //   "useStyledSystemPropsResolver 2222",
    //   keyValue,
    //   window.performance.now()
    // );
  }
};

export const getStyledComponent = (
  name: string,
  colorMode: ColorMode,
  inputProps?: {}
) => {
  const componentTheme = get(theme, `components.${name}`, {});
  const componentStyle = componentTheme.defaultProps?.style;

  const inputWithDefaultProps = {
    ...componentTheme.defaultProps,
    ...inputProps,
  };
  let flattenProps: any, specificityMap;
  // console.log("incoming ******", incomingWithDefaultProps);
  [flattenProps, specificityMap] = propsFlattener(
    {
      props: inputWithDefaultProps,
      platform: Platform.OS,
      colormode: colorMode,
      state: {},
      currentSpecificityMap: {},
      previouslyFlattenProps: flattenProps || {},
      cascadePseudoProps: false,
    },
    1
  );
  // console.log(flattenProps, "********", componentTheme.defaultProps);
  [flattenProps] = mergeStylesWithSpecificity(
    componentTheme,
    flattenProps,
    specificityMap,
    colorMode
  );

  if (name == 'Button') {
    console.log(flattenProps, 'flatten');
  }

  let internalPseudoProps: any = {};
  //TODO: refactor
  for (const property in flattenProps) {
    if (
      property.startsWith('_') &&
      !['_dark', '_light', '_web', '_ios', '_android', '_important'].includes(
        property
      )
    ) {
      internalPseudoProps[property] = flattenProps[property];
    }
  }

  // ["_dark", "_light", "_web", "_ios", "_android", "_important"].includes(
  //   flattenProps
  // );
  const styleObj = resolvePropsToStyle(
    flattenProps,
    componentStyle,
    theme,
    false,
    4,
    false,
    // getResponsiveStyles,
    undefined
  );

  styleObj.internalPseudoProps = internalPseudoProps;
  return styleObj;
};

const resolveComponentThemeStyle = (
  incomingProps: any,
  themeType: Array<string>,
  providedTheme: any
): any => {
  try {
    if (themeType[1]) {
      return typeof providedTheme[themeType[0]][themeType[1]] !== 'function'
        ? providedTheme[themeType[0]][themeType[1]]
        : providedTheme[themeType[0]][themeType[1]]({
            theme,
            ...incomingProps,
            colorMode: 'light',
          });
    } else {
      return typeof providedTheme[themeType[0]] !== 'function'
        ? providedTheme[themeType[0]]
        : providedTheme[themeType[0]]({
            theme,
            ...incomingProps,
            colorMode: 'light',
          });
    }
  } catch {
    return {};
  }
};
const resolveComponentTheme = (
  incomingProps: any,
  themeType: Array<string>,
  providedTheme: any
): any => {
  try {
    if (themeType[1]) {
      return typeof providedTheme[themeType[0]][themeType[1]] !== 'function'
        ? providedTheme[themeType[0]][themeType[1]]
        : providedTheme[themeType[0]][themeType[1]]({
            theme,
            ...incomingProps,
            colorMode: 'light',
          });
    } else {
      return typeof providedTheme[themeType[0]] !== 'function'
        ? providedTheme[themeType[0]]
        : providedTheme[themeType[0]]({
            theme,
            ...incomingProps,
            colorMode: 'light',
          });
    }
  } catch {
    return {};
  }
};

const mergeStylesWithSpecificity = (
  componentTheme: any,
  flattenProps: any,
  specificityMap: any,
  colorMode: any
) => {
  let combinedBaseStyle = {};
  let combinedVariantStyle = {};
  let combinedSizeStyle = {};
  let flattenBaseStyle, baseSpecificityMap;
  const extendedTheme: Array<any> = [];

  if (!isEmpty(componentTheme)) extendedTheme.push(componentTheme);

  extendedTheme.map((extededComponentTheme: any) => {
    if (extededComponentTheme.baseStyle) {
      combinedBaseStyle = {
        ...combinedBaseStyle,
        ...resolveComponentTheme(
          flattenProps,
          ['baseStyle'],
          extededComponentTheme
        ),
      };
    }
    if (flattenProps.variant) {
      if (extededComponentTheme.variants) {
        combinedVariantStyle = {
          ...combinedVariantStyle,
          ...resolveComponentTheme(
            flattenProps,
            ['variants', flattenProps.variant],
            extededComponentTheme
          ),
        };
      }
    }
    if (
      flattenProps.size &&
      extededComponentTheme?.sizes &&
      extededComponentTheme?.sizes[flattenProps.size]
    ) {
      if (
        typeof extededComponentTheme.sizes[flattenProps.size] === 'string' ||
        typeof extededComponentTheme.sizes[flattenProps.size] === 'number'
      ) {
        flattenProps.size = extededComponentTheme.sizes[flattenProps.size];
      } else {
        combinedSizeStyle = {
          ...combinedSizeStyle,
          ...resolveComponentTheme(
            flattenProps,
            ['sizes', flattenProps.size],
            extededComponentTheme
          ),
        };
        flattenProps.size = undefined;
      }
    }
  });

  // console.log(combinedBaseStyle, " ******* ");
  if (!isEmptyObj(combinedBaseStyle)) {
    [flattenBaseStyle, baseSpecificityMap] = callPropsFlattener(
      combinedBaseStyle,
      specificityMap,
      1,
      {},
      { colorMode: colorMode },
      {},
      flattenProps
    );
  }

  // NOTE: Resolving variants
  let flattenVariantStyle, variantSpecificityMap;
  // Extracting props from variant

  // console.log(combinedVariantStyle, "999999");
  if (!isEmptyObj(combinedVariantStyle)) {
    [flattenVariantStyle, variantSpecificityMap] = callPropsFlattener(
      combinedVariantStyle,
      baseSpecificityMap || specificityMap,
      1,
      {},
      { colorMode: colorMode },
      {},
      flattenProps
    );

    // We remove variant from original props if we found it in the componentTheme
    //@ts-ignore
    flattenProps.variant = undefined;
  }

  // NOTE: Resolving size

  let flattenSizeStyle, sizeSpecificityMap;
  // Extracting props from size

  // console.log(combinedSizeStyle, "&&&&&&&");
  if (!isEmptyObj(combinedSizeStyle)) {
    [flattenSizeStyle, sizeSpecificityMap] = callPropsFlattener(
      combinedSizeStyle,
      variantSpecificityMap || baseSpecificityMap || specificityMap,
      1,
      {},
      { colorMode: colorMode },
      {},
      flattenProps
    );
  }

  //////

  const defaultStyles = merge(
    {},
    flattenBaseStyle,
    flattenVariantStyle,
    flattenSizeStyle
  );

  const defaultSpecificity = merge(
    {},
    specificityMap,
    baseSpecificityMap,
    variantSpecificityMap,
    sizeSpecificityMap
  );

  // console.log(defaultSpecificity, "h3h3h3");

  flattenProps = propsSpreader(
    { ...defaultStyles, ...flattenProps },
    defaultSpecificity
  );
  return [flattenProps];
};

export const makeStyledComponent = (
  Comp: any,
  componentName: keyof ITheme['components']
) => {
  //TODO: component theme

  const globalLightStyle = resolveComponentThemeStyle(componentName, 'light');
  const globalDarkStyle = resolveComponentThemeStyle(componentName, 'dark');

  console.log(StyleSheet.flatten(globalLightStyle.style), 'hello style');
  return React.forwardRef(({ debug, ...props }: any, ref: any) => {
    // console.log(props, "hello props **********");
    const [style, restProps] = useStyledSystemPropsResolver(props);
    // if (process.env.NODE_ENV === "development" && debug) {
    //   /* eslint-disable-next-line */
    //   console.log(
    //     `%cstyleSystem`,
    //     "background: #4b5563; color: #d97706; font-weight: 700; padding: 2px 8px;"
    //   );
    //   /* eslint-disable-next-line */
    //   console.log("%c props: ", "color: #4ade80; font-weight: 700;", props);
    //   /* eslint-disable-next-line */
    //   console.log("%c style: ", "color: #22d3ee; font-weight: 700;", style);
    //   /* eslint-disable-next-line */
    //   console.log(
    //     "%c restProps: ",
    //     "color: #22d3ee; font-weight: 700;",
    //     restProps
    //   );
    // }

    // console.log("box props", props);
    // const safeAreaProps = useSafeArea(props);
    // console.timeEnd("useSafeArea");

    // check dark / light mode
    // based on color mode pass style

    const { colorMode } = useColorMode();
    let componentStyle = {};
    if (colorMode === 'light') {
      componentStyle = globalLightStyle;
    } else {
      componentStyle = globalDarkStyle;
    }

    // console.log(StyleSheet.flatten(componentStyle.style), "hello *********");
    return (
      <Comp {...restProps} style={[style, componentStyle.style]} ref={ref}>
        {props.children}
      </Comp>
    );
  });
};
