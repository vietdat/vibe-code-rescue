'use strict';

// Small built-in advisory list. Every entry below is a real, well-known
// vulnerability with a correct CVE id and a correct fixed version.
// Only advisories we are sure about are included; do not add entries
// from memory without verifying the CVE and the fixed version.
const ADVISORIES = [
  {
    package: 'lodash',
    fixedIn: '4.17.21',
    cve: 'CVE-2020-8203',
    title: 'Prototype pollution in lodash',
    severity: 'high',
  },
  {
    package: 'minimist',
    fixedIn: '1.2.6',
    cve: 'CVE-2021-44906',
    title: 'Prototype pollution in minimist',
    severity: 'high',
  },
  {
    package: 'qs',
    fixedIn: '6.10.3',
    cve: 'CVE-2022-24999',
    title: 'Prototype pollution in qs (querystring parsing)',
    severity: 'high',
  },
  {
    package: 'json5',
    fixedIn: '2.2.2',
    cve: 'CVE-2022-46175',
    title: 'Prototype pollution in JSON5',
    severity: 'high',
  },
  {
    package: 'semver',
    fixedIn: '7.5.2',
    cve: 'CVE-2022-25883',
    title: 'Regular expression denial of service (ReDoS) in semver',
    severity: 'medium',
  },
];

// Packages whose names are close to a popular package and are commonly
// used for typosquatting. `name` is the suspicious spelling,
// `looksLike` is the popular package it imitates.
const TYPOSQUAT = [
  { name: 'lodahs', looksLike: 'lodash' },
  { name: 'lodashs', looksLike: 'lodash' },
  { name: 'lodsh', looksLike: 'lodash' },
  { name: 'expres', looksLike: 'express' },
  { name: 'exress', looksLike: 'express' },
  { name: 'expresss', looksLike: 'express' },
  { name: 'reactt', looksLike: 'react' },
  { name: 'reac', looksLike: 'react' },
  { name: 'axois', looksLike: 'axios' },
  { name: 'axioss', looksLike: 'axios' },
  { name: 'typescipt', looksLike: 'typescript' },
  { name: 'typescriptt', looksLike: 'typescript' },
  { name: 'vitee', looksLike: 'vite' },
  { name: 'chalck', looksLike: 'chalk' },
  { name: 'comanderr', looksLike: 'commander' },
  { name: 'nextt', looksLike: 'next' },
  { name: 'mongose', looksLike: 'mongoose' },
  { name: 'prismaa', looksLike: 'prisma' },
  { name: 'jestt', looksLike: 'jest' },
  { name: 'webpackk', looksLike: 'webpack' },
];

const POPULAR = [
  'lodash', 'express', 'react', 'axios', 'typescript', 'vite', 'chalk',
  'commander', 'next', 'mongoose', 'prisma', 'jest', 'webpack', 'vue',
  'angular', 'eslint', 'prettier', 'nodemon', 'cors', 'dotenv', 'jsonwebtoken',
  'bcrypt', 'stripe', 'supabase', 'tailwindcss',
];

module.exports = { ADVISORIES, TYPOSQUAT, POPULAR };
