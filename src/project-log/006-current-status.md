Date

11 / 03 / 2026

1️⃣ Goal (Project Target)

Build a real industrial “Control Center” web application for Plant monitoring that looks production-grade now and can later be upgraded to connect to real factory data sources such as PLC, HMI, station IDs, IP-based devices, backend APIs, and industrial protocols.

Core expectations:

Dark industrial control-center UI

CAD-like 3D Devices / Alarms view

Responsive layout across desktop / tablet / mobile

HMI-style station details

Live alarms / downtime / analytics / shift totals

Ready for future integration with:

PLC / HMI / SCADA / IT network

OPC UA / MQTT / Modbus TCP / REST

Backend API + WebSocket / SSE

Database / historian / TimescaleDB

2️⃣ Current Reality (Very Important)

Current UI is advanced, but current data is still mostly demo/mock.

That means:

The visual system is real enough for presentation

The data architecture direction is good

But the app is not yet connected to trusted live plant data

So the project is currently:

Mode

UI-ready + Architecture-ready + Demo-data-driven

Not yet:

Mode

Plant-live-data-ready

3️⃣ Demo / Hybrid / Future-Ready Table
File	Current Type	Status	Notes
src/data/mock/plant3.units.mock.js	Demo / Registry Prototype	⚠️ Partial	Good registry mindset, but PODS is empty and live source mapping is missing
src/data/mock/stations.mock.js	Demo	❌ Fake data	Station telemetry is fully mock
src/services/stations.service.js	Demo Service	⚠️ Partial	Good service shape, but reads only from mock
src/services/alarms.api.js	Hybrid / Future-ready	✅ Good base	Connects frontend actions to backend endpoints
src/services/downtime.analytics.api.js	Hybrid / Future-ready	✅ Good base	Reads analytics from backend if backend exists
src/state/alarmCenter.store.js	Demo Event Engine	⚠️ Partial	Useful event model, but still self-generates demo alarms
src/state/downtime.store.js	Demo / Prototype	⚠️ Partial	Builds downtime sessions from frontend log, not real plant source
src/pages/DevicesPage.js	Demo UI	⚠️ Partial	Strong UI, but data comes from getPlant3Units() mock
src/components/station/StationHmiDrawer.jsx	Future-ready UI consumer	✅ Good base	Structured well for station telemetry, but currently fed by mock
src/pages/AlarmsPage.js	Demo + Hybrid	⚠️ Partial	Strong UI + backend calls exist, but state is still mostly demo-driven
4️⃣ What Is Actually Fake Right Now
Fully Demo / Fake Right Now

These parts are currently not based on real plant data:

Unit status in DevicesPage

Unit counters in DevicesPage

Shift totals in DevicesPage

HMI messages in DevicesPage

Station telemetry in StationHmiDrawer

Alarm generation in alarmCenter.store.js

Downtime sessions in downtime.store.js

Alarm/downtime state visualization in AlarmsPage

Why?

Because the app currently uses:

seeded random generation

static mock station objects

frontend-generated event logs

no real unitId -> stationId -> source mapping yet

5️⃣ What Is Already Good / Strong
✅ Architecture Direction Is Good

The project already has the correct major layers:

UI pages

services

state stores

station drawer

API-ready frontend calls

route/layout structure

mock registry concept

✅ Event Model Is Good

You already defined solid event types:

DT_START

DT_END

ALARM_RAISE

ALARM_CLEAR

This is good because later real backend/live streams can publish the same event shapes.

✅ Station Drawer Is a Strong Foundation

StationHmiDrawer.jsx is one of the strongest files because it already expects:

stationId

station metadata

telemetry

alarms

downtime

shift data

That is exactly how a real system should consume live data later.

✅ API Layer Direction Is Correct

These files are going in the right direction:

alarms.api.js

downtime.analytics.api.js

They show that your UI is already being prepared to talk to backend endpoints.

6️⃣ Core Architecture Problem (Main Gap)

The main technical gap is:

There is no single source of truth yet

Right now you have three separate data worlds:

A) UI Units World

Used by:

DevicesPage.js

AlarmsPage.js

Source:

getPlant3Units() from plant3.units.mock.js

B) Station Telemetry World

Used by:

StationHmiDrawer.jsx

Source:

stations.mock.js

stations.service.js

C) Backend/API World

Used by:

alarms.api.js

downtime.analytics.api.js

Source:

backend endpoints on localhost:4000

7️⃣ What Is Missing Technically

To become truly integration-ready, the project still needs:

Missing items

Real unitId -> stationId mapping

Real stationId -> PLC/IP/source mapping

Source registry for plant assets

Protocol/source definition per station

Tag map / signal map

Live telemetry service

Live alarm stream source

Removal/replacement of demo engine after real connection

Unified source-of-truth layer

8️⃣ The Project Brain (Recommended Core Layer)

The real brain of the project should be a central registry file.

Recommended new file
src/data/plant/plant3.registry.js

This file should become the single source of truth for every real station/unit.

It should contain:

unitId

stationId

displayName

area

line

plcId

ipAddress

protocol

endpoint

tag map

camera source

hmi source

9️⃣ If Someone Gives You an IP Address, Where Should It Go?
Correct answer:

Do not store the IP inside pages or UI components.

It should go into the central registry/config layer.

Best location:
src/data/plant/plant3.registry.js
Example
export const PLANT3_REGISTRY = [
  {
    unitId: "DT-FRT-01",
    stationId: "ST-102",
    displayName: "DT FRT 01",
    area: "DT",
    line: "FRT",
    source: {
      plcId: "PLC-102",
      ipAddress: "192.168.1.52",
      protocol: "opcua",
      endpoint: "opc.tcp://192.168.1.52:4840"
    },
    tags: {
      state: "",
      goodCount: "",
      defectCount: "",
      suspectCount: "",
      cycleCurrentSec: "",
      cycleAvgSec: "",
      cycleTargetSec: "",
      alarmCode: "",
      downtimeActive: "",
      downtimeReason: "",
      modelCode: ""
    }
  }
];
1️⃣0️⃣ Important Rule About IP

An IP address alone is not enough.

If someone gives you:

192.168.1.52

you still need to know:

What device is this?

PLC or HMI or camera or gateway?

What protocol is exposed?

What tag list is available?

Is it read-only?

How do we authenticate?

What data can be extracted?

So the real useful object is not just ipAddress, but:

ipAddress

protocol

endpoint

tag map

1️⃣1️⃣ File-by-File Project Brain Notes
src/data/mock/plant3.units.mock.js

Current role:

Unit/pod visual registry

mock KPI generation

fallback unit tiles

Assessment:

Good concept

not final source of truth

should later focus on layout/view model only

Important issue:

PODS is still empty

src/data/mock/stations.mock.js

Current role:

station metadata

mock telemetry snapshots

Assessment:

good for demo

not production-safe

should be separated from real registry later

src/services/stations.service.js

Current role:

returns station metadata

returns station telemetry

merges metadata + telemetry

Assessment:

this should become a key bridge file later

currently still mock-only

should later read from central registry + live telemetry source

src/services/alarms.api.js

Current role:

sends downtime actions to backend

Assessment:

good foundation

should remain as action API

not the place to store PLC/IP config

src/services/downtime.analytics.api.js

Current role:

fetches summary / events from backend analytics

Assessment:

good and future-ready

backend integration direction is correct

src/state/alarmCenter.store.js

Current role:

alarm log

badge count

active maps

demo generator

Assessment:

event model is strong

demo engine must later be disabled or replaced

future source should be:

WebSocket

SSE

backend event stream

src/state/downtime.store.js

Current role:

builds sessions from alarm log

persists to localStorage

Assessment:

useful prototype

not yet historian-grade

should later use backend-confirmed events or analytics

src/pages/DevicesPage.js

Current role:

CAD 3D device/unit map

HMI-style preview panel

shift totals panel

Assessment:

strong UI

currently fed by mock unit data

should later consume live registry + telemetry

src/components/station/StationHmiDrawer.jsx

Current role:

station HMI drawer with overview / alarms / downtime / totals

Assessment:

one of the best future-ready pieces

already shaped for real station telemetry

needs stronger mapping from unit to station

src/pages/AlarmsPage.js

Current role:

live alarm/downtime visual page

history

focus on selected unit

downtime start/end actions

Assessment:

visually strong

action API exists

but active state still mostly comes from demo-generated frontend log

1️⃣2️⃣ Recommended Future Structure
src/
  data/
    plant/
      plant3.registry.js
      plant3.layout.js
      plant3.mockTelemetry.js

  services/
    api.js
    stations.service.js
    telemetry.service.js
    alarms.api.js
    downtime.analytics.api.js

  state/
    alarmCenter.store.js
    downtime.store.js
    telemetry.store.js
1️⃣3️⃣ No UI Shock Expected

Good news:

Adding the project brain does NOT require major UI changes.

If done correctly:

DevicesPage look can stay the same

AlarmsPage look can stay the same

StationHmiDrawer look can stay the same

Most changes will happen in:

registry

services

state/data flow

Possible small future UI additions only if you want to display:

connection status

protocol

source health

last telemetry time

PLC online/offline state

1️⃣4️⃣ Next Development Phase
Phase: Data Brain Standardization

Create the central registry:

src/data/plant/plant3.registry.js

Move real plant identity there:

unitId

stationId

source config

IP / protocol / endpoint

tag placeholders

Refactor services:

stations.service.js should read from registry

keep mock fallback temporarily

Keep UI stable:

no major visual refactor needed yet

Later connect:

backend live telemetry

alarm event stream

downtime analytics

shift totals source

1️⃣5️⃣ Current Project Mode
Right now

High-quality prototype with strong future integration direction

Not yet

Verified live industrial monitoring system

1️⃣6️⃣ Final Summary

FactorySphere is currently in a strong prototype state:

UI quality is moving in the right direction

architecture is promising

service/state separation exists

backend hooks are partially prepared

But before live plant integration, the project still needs one major backbone piece:

Missing backbone:

A central station/unit/source registry

That registry will become the real brain of the project and the correct place to store:

IP addresses

station IDs

PLC IDs

protocols

endpoints

tag mappings