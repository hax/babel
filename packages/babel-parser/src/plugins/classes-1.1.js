// @flow

import { types as tt, TokenType } from "../tokenizer/types";
import type Parser from "../parser";
import * as N from "../types";
import type { Options } from "../options";
import type { Position } from "../util/location";

export type ClassMember =
  | N.ClassMember
  | ClassVariableDeclaration
  | ClassHiddenMethod
  | ClassInitializer;

export type ClassHiddenMethod = N.ClassMethod & {
  type: "ClassHiddenMethod",
  key: N.Identifier,
  computed: false,
};

export type ClassVariableDeclaration = N.VariableDeclaration & {
  type: "ClassVariableDeclaration",
};

export type ClassInitializer = N.NodeBase &
  N.HasDecorators & {
    body: N.BlockStatement,
  };

export type EstreeMethodDefinition = N.EstreeMethodDefinition & {
  hidden: boolean,
};

export type MethodLike = N.MethodLike | ClassHiddenMethod;

export default (superClass: Class<Parser>): Class<Parser> =>
  class extends superClass {
    c11Options: Class11SyntaxOptions & {
      operatorCharCodes: Array<number>,
      operatorTokenType: TokenType,
    };

    constructor(options: ?Options, input: string) {
      super(options, input);
      this.c11Options = c11(this.plugins["classes-1.1"]);
    }

    c11ParseClassVar(varDecl: ClassVariableDeclaration) {
      this.parseVarStatement(varDecl, tt._var);
      varDecl.type = "ClassVariableDeclaration";
      return varDecl;
    }

    c11PushClassVar(classBody: N.ClassBody, varDecl: ClassVariableDeclaration) {
      if (!this.c11Options.instanceVariablesInitializer) {
        for (const d of varDecl.declarations) {
          if (d.init) {
            this.raise(d.start, "Instance variables initializer is disabled");
          }
        }
      }
      // $FlowIgnore
      classBody.body.push(varDecl);
    }

    c11FinishHiddenMethod(m: ClassHiddenMethod | EstreeMethodDefinition) {
      if (
        m.key.type === "Literal" || // estree
        m.key.type === "StringLiteral" ||
        m.key.type === "NumericLiteral" ||
        m.computed
      ) {
        this.unexpected(m.key.start);
      } else if (m.type === "MethodDefinition") {
        // estree
        m.hidden = true;
      } else if ((m: N.ClassMethod).type === "ClassMethod") {
        m.type = "ClassHiddenMethod";
      } else {
        this.unexpected(m.key.start);
      }
    }

    c11IsHiddenOperator(code: number) {
      const codes = this.c11Options.operatorCharCodes;
      if (code !== codes[0]) return false;
      for (let i = 1; i < codes.length; ++i) {
        if (this.input.charCodeAt(this.state.pos + i) !== codes[i]) {
          return false;
        }
      }
      return true;
    }

    // ==================================
    // Overrides
    // ==================================

    readToken(code: number) {
      if (this.c11IsHiddenOperator(code)) {
        this.finishOp(
          this.c11Options.operatorTokenType,
          this.c11Options.operatorCharCodes.length,
        );
      } else {
        super.readToken(code);
      }
    }

    parseSubscript(
      base: N.Expression,
      startPos: number,
      startLoc: Position,
      noCalls: ?boolean,
      state: N.ParseSubscriptState,
    ): N.Expression {
      if (this.eat(this.c11Options.operatorTokenType)) {
        const node = this.startNodeAt(startPos, startLoc);
        node.object = base;
        node.hiddenName = this.parseIdentifier();
        node.computed = false;
        return this.finishNode(node, "MemberExpression");
      } else {
        return super.parseSubscript(base, startPos, startLoc, noCalls, state);
      }
    }

    parseClassMemberWithIsStatic(
      classBody: N.ClassBody,
      member: ClassMember,
      state: { hadConstructor: boolean },
      isStatic: boolean,
    ) {
      if (isStatic && this.match(tt.braceL)) {
        // $FlowIgnore
        member.body = this.parseBlock();
        this.finishNode(member, "ClassInitializer");
        // $FlowIgnore
        classBody.body.push(member);
        return;
      }

      const superCall = () => {
        // $FlowIgnore
        super.parseClassMemberWithIsStatic(classBody, member, state, isStatic);
      };

      const isMethod = () => this.lookahead().type === tt.parenL;

      if (this.state.value === this.c11Options.instanceVariablesKeyword) {
        if (isMethod()) return superCall();
        // $FlowIgnore
        const varDecl = this.c11ParseClassVar(member);
        this.c11PushClassVar(classBody, varDecl);
        return;
      }

      if (this.state.value === this.c11Options.hiddenMethodsKeyword) {
        if (isMethod()) return superCall();
        this.next(); // eat hidden keyword
        if (isStatic) superCall();
        // $FlowIgnore
        else super.parseClassMember(classBody, member, state); // allow { hidden static f() }
        // $FlowIgnore
        this.c11FinishHiddenMethod(member);
        return;
      }

      superCall();
    }
  };

export type Class11SyntaxOptions = {
  operator: string, // -> :: ~> .# ..
  instanceVariablesKeyword: string, // var state hidden my internal ...
  instanceVariablesInitializer: boolean,
  instanceVariablesShorthand: boolean,
  hiddenMethodsKeyword: string, // hidden my internal ...
  hiddenMethodsShorthand: boolean,
};

const profiles: { [name: string]: Class11SyntaxOptions } = {
  default: {
    operator: "->",
    instanceVariablesKeyword: "var",
    instanceVariablesInitializer: true,
    instanceVariablesShorthand: true,
    hiddenMethodsKeyword: "hidden",
    hiddenMethodsShorthand: false,
  },
  minimal: {
    operator: "->",
    instanceVariablesKeyword: "var",
    instanceVariablesInitializer: false,
    instanceVariablesShorthand: false,
    hiddenMethodsKeyword: "hidden",
    hiddenMethodsShorthand: false,
  },
  my: {
    operator: "::",
    instanceVariablesKeyword: "my",
    instanceVariablesInitializer: true,
    instanceVariablesShorthand: true,
    hiddenMethodsKeyword: "my",
    hiddenMethodsShorthand: true,
  },
  internal: {
    operator: "~>",
    instanceVariablesKeyword: "internal",
    instanceVariablesInitializer: true,
    instanceVariablesShorthand: false,
    hiddenMethodsKeyword: "internal",
    hiddenMethodsShorthand: false,
  },
  // '#': {
  //   operator: '.#',
  //   instanceVariablesKeyword: '#',
  //   instanceVariablesInitializer: true,
  //   instanceVariablesShorthand: false,
  //   hiddenMethodsKeyword: '#',
  //   hiddenMethodsShorthand: false,
  // },
};

function c11(
  options: Class11SyntaxOptions & { profile?: $Keys<typeof profiles> },
) {
  const { profile = "default" } = options;
  options = Object.assign({}, profiles[profile], options);
  options.operatorCharCodes = toCharCodes(options.operator);
  options.operatorTokenType = new TokenType(options.operator);
  return options;
}

function toCharCodes(s: string) {
  const codes = [];
  for (let i = 0; i < s.length; ++i) codes.push(s.charCodeAt(i));
  return codes;
}
