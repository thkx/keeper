import { type ProperiteItemMap } from './parser'
import { type TypeTransformMap } from './table'

type TrimLeft<Str extends string> = Str extends ` ${infer Rest}`
  ? TrimLeft<Rest>
  : Str
type TrimRight<Str extends string> = Str extends `${infer Rest} `
  ? TrimRight<Rest>
  : Str
type Trim<Str extends string> = TrimLeft<TrimRight<Str>>

/*
 * Recursively convert types, supporting arrays and inheritance of reference types.
 *
 * e.g.
 *
 * type Example = GetType<'int'> // number
 * type ExampleArr = GetType<'int[]'> // number[]
 * type ExampleExtend = GetType<'*other', { other: number }> // number
 *
 **/
type GetType<
  Str extends string,
  Includes extends Object = {},
> = Str extends `${infer Type}[]`
  ? Array<GetType<Type, Includes>>
  : Str extends keyof TypeTransformMap
    ? TypeTransformMap[Str]
    : Str extends `*${infer IncloudName}`
      ? IncloudName extends keyof Includes
        ? Includes[IncloudName]
        : never
      : never

/**
 * Parsing DSL (Domain-Specific Language) for declaring
 * types of single-line object properties.
 *
 * Supporting directives like "copy as" in the DSL.:
 *
 * e.g.
 *
 * type Keeper = ParseLine<'name string copyas:test'>
 *
 * The resulting type would be:
 *
 * type Keeper = {
 *  name: string,
 *  test: string
 * }
 *
 **/
type ParseLine<Str extends string, Includes extends Object = {}> =
  Trim<Str> extends `${infer Key} ${infer Type} ${infer Extensions}`
    ? Extensions extends `copyas:${infer CopyName}`
      ? {
          [x in Key | CopyName]: GetType<TrimLeft<Type>, Includes>;
        }
      : { [x in Key]: GetType<TrimLeft<Type>, Includes> }
    : Trim<Str> extends `${infer Key} ${infer Type}`
      ? { [x in Key]: GetType<TrimLeft<Type>, Includes> }
      : {}

/**
 * Convert a DSL for declaring types of
 * multi-line object properties to TypeScript types.
 *
 * Support passing type inheritance as the second parameter.
 **/
type ParseRuleString<
  Str extends string,
  Includes extends Object = {},
  Origins extends Object = {},
> = Str extends `${infer Line}\n${infer NextLine}`
  ? ParseRuleString<NextLine, Includes, ParseLine<Line, Includes> & Origins>
  : ParseLine<Str, Includes> & Origins

/**
 * Convert a struct with inheritance to a TypeScript interface type.
 **/
type TransferKeeperExtendType<Config extends KeeperConfig> =
  Config['extends'] extends Record<string, KeeperInstance>
    ? {
        [x in keyof Config['extends']]: ReturnType<
        Config['extends'][x]['from']
        >;
      }
    : {}

/**
 * Keeper configuration options, including inheritable objects.
 **/
export interface KeeperConfig {
  extends?: Record<string, KeeperInstance>
}

export interface KeeperInstance<
  T extends string = '',
  Config extends KeeperConfig = {},
> {
  properties: ProperiteItemMap
  config: Config
  from: (source: any) => ParseRuleString<T, TransferKeeperExtendType<Config>>
}
