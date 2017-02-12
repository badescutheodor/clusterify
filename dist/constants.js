"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * File containing constants used by
 * bridge and event emitter
 *
 * @type {string}
 */
var EVENT_LOADED = exports.EVENT_LOADED = "cruster:loaded";
var EVENT_SUCCESS_SET_ID = exports.EVENT_SUCCESS_SET_ID = "cruster:success:set:id";

var ACTION_PENDING_SET_ID = exports.ACTION_PENDING_SET_ID = "set:pending:worker:id";
var ACTION_SUCCESS_SET_ID = exports.ACTION_SUCCESS_SET_ID = "set:success:worker:id";
var ACTION_CONFIRM_EMIT = exports.ACTION_CONFIRM_EMIT = "confirm:message:received";
var ACTION_SET_WORKERS_COUNT = exports.ACTION_SET_WORKERS_COUNT = "set:work:total:count";
var ACTION_GET_STORAGE = exports.ACTION_GET_STORAGE = "cruster:get:storage";
var ACTION_SET_STORAGE = exports.ACTION_SET_STORAGE = "cruster:set:storage";