/** Minimal server-ui mock that records forms and consumes queued responses. */

import { nextResponse, state } from "./state.js";

export const FormCancelationReason = {
  UserBusy: "UserBusy",
  UserClosed: "UserClosed",
};

export class ActionFormData {
  constructor() {
    this.titleText = "";
    this.bodyText = "";
    this.buttons = [];
  }

  title(text) {
    this.titleText = text;
    return this;
  }

  body(text) {
    this.bodyText = text;
    return this;
  }

  button(text, icon) {
    this.buttons.push({ text, icon });
    return this;
  }

  divider() {
    return this;
  }

  header() {
    return this;
  }

  label() {
    return this;
  }

  async show(player) {
    if (state.formFailures > 0) {
      state.formFailures -= 1;
      throw new Error("mock form API failure");
    }
    const form = {
      type: "action",
      player,
      title: this.titleText,
      body: this.bodyText,
      buttons: this.buttons.map((button) => button.text),
      icons: this.buttons.map((button) => button.icon),
    };
    state.forms.push(form);
    return nextResponse(form);
  }
}

export class ModalFormData {
  constructor() {
    this.titleText = "";
    this.fields = [];
    this.submitText = "";
  }

  title(text) {
    this.titleText = text;
    return this;
  }

  toggle(label, options) {
    this.fields.push({
      type: "toggle",
      label,
      defaultValue: typeof options === "boolean" ? options : options?.defaultValue,
    });
    return this;
  }

  slider(label, minimum, maximum, options) {
    this.fields.push({
      type: "slider",
      label,
      minimum,
      maximum,
      defaultValue: typeof options === "number" ? options : options?.defaultValue,
      valueStep: typeof options === "object" ? options?.valueStep : undefined,
    });
    return this;
  }

  dropdown(label, items, options) {
    this.fields.push({
      type: "dropdown",
      label,
      items: [...items],
      defaultValue: typeof options === "number" ? options : options?.defaultValueIndex,
    });
    return this;
  }

  textField(label, placeholder, options) {
    this.fields.push({
      type: "text",
      label,
      placeholder,
      defaultValue: typeof options === "string" ? options : options?.defaultValue,
    });
    return this;
  }

  submitButton(text) {
    this.submitText = text;
    return this;
  }

  divider() {
    return this;
  }

  header() {
    return this;
  }

  label() {
    return this;
  }

  async show(player) {
    if (state.formFailures > 0) {
      state.formFailures -= 1;
      throw new Error("mock form API failure");
    }
    const form = {
      type: "modal",
      player,
      title: this.titleText,
      fields: this.fields,
      submitText: this.submitText,
    };
    state.forms.push(form);
    return nextResponse(form);
  }
}

export class MessageFormData {
  async show() {
    throw new Error("MessageFormData is not used by ATLAS CLIENT");
  }
}
