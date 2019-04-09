"use strict";
// Start debuger
if (process.env.DEBUG === "1") {
	require("inspector").open(9229, "0.0.0.0", false);
	// require("inspector").open(9229, "0.0.0.0", true);
}

const Homey = require("homey");
const { HomeyAPI } = require("athom-api");

class SarahApp extends Homey.App {
	onInit() {
		// Initialize Homey-App Loggers
		this.appLogListener = new Homey.FlowCardTrigger("app_log_listener");
		this.appLogListener.register().registerRunListener(Promise.resolve(true));

		this.appErrorListener = new Homey.FlowCardTrigger("app_error_listener");
		this.appErrorListener.register().registerRunListener(Promise.resolve(true));

		this.appDebugListener = new Homey.FlowCardTrigger("app_debug_listener");
		this.appDebugListener.register().registerRunListener(Promise.resolve(true));

		this.log(`${Homey.app.manifest.name.en}-App - v${Homey.app.manifest.version} is running...`);

		// Initialize sarah-app
		this.settings = new Map(Object.entries(Homey.ManagerSettings.get("settings") || {}));
		if (this.settings.size == 0) {
			this.log("Initialize settings");
			this.initSettings();
		}
			
		this.currentStates = [];
		Homey.ManagerSettings.set("currentStates", this.currentStates);

		// Initialize Sarah-FlowCards
		this.sarahInitListener = new Homey.FlowCardTrigger("init_listener");
		this.sarahInitListener.register().registerRunListener(Promise.resolve(true));

		this.sarahEventListener = new Homey.FlowCardTrigger("event_listener");
		this.sarahEventListener.register().registerRunListener(this.onSarahEventListener.bind(this));
		this.sarahEventListener.getArgument("zone").registerAutocompleteListener(this.onZoneAutocomplete.bind(this));
		this.sarahEventListener.getArgument("group").registerAutocompleteListener(this.onGroupAutocomplete.bind(this));
		this.sarahEventListener.getArgument("event").registerAutocompleteListener(this.onEventAutocomplete.bind(this));

		this.sarahEventEmitter = new Homey.FlowCardAction("event_emitter");
		this.sarahEventEmitter.register().registerRunListener(this.onSarahEventEmitter.bind(this));
		this.sarahEventEmitter.getArgument("zone").registerAutocompleteListener(this.onZoneAutocomplete.bind(this));
		this.sarahEventEmitter.getArgument("group").registerAutocompleteListener(this.onGroupAutocomplete.bind(this));
		this.sarahEventEmitter.getArgument("event").registerAutocompleteListener(this.onEventAutocomplete.bind(this));

		this.sarahEventArgsEmitter = new Homey.FlowCardAction("event_args_emitter");
		this.sarahEventArgsEmitter.register().registerRunListener(this.onSarahEventEmitter.bind(this));
		this.sarahEventArgsEmitter.getArgument("zone").registerAutocompleteListener(this.onZoneAutocomplete.bind(this));
		this.sarahEventArgsEmitter.getArgument("group").registerAutocompleteListener(this.onGroupAutocomplete.bind(this));
		this.sarahEventArgsEmitter.getArgument("event").registerAutocompleteListener(this.onEventAutocomplete.bind(this));

		this.sarahStateListener = new Homey.FlowCardTrigger("state_listener");
		this.sarahStateListener.register().registerRunListener(this.onSarahStateListener.bind(this));
		this.sarahStateListener.getArgument("zone").registerAutocompleteListener(this.onZoneAutocomplete.bind(this));
		this.sarahStateListener.getArgument("group").registerAutocompleteListener(this.onGroupAutocomplete.bind(this));
		this.sarahStateListener.getArgument("state").registerAutocompleteListener(this.onStateAutocomplete.bind(this));

		this.sarahStateValueListener = new Homey.FlowCardTrigger("state_value_listener");
		this.sarahStateValueListener.register().registerRunListener(this.onSarahStateValueListener.bind(this));
		this.sarahStateValueListener.getArgument("zone").registerAutocompleteListener(this.onZoneAutocomplete.bind(this));
		this.sarahStateValueListener.getArgument("group").registerAutocompleteListener(this.onGroupAutocomplete.bind(this));
		this.sarahStateValueListener.getArgument("state").registerAutocompleteListener(this.onStateValueAutocomplete.bind(this));

		this.sarahStateValueCondition = new Homey.FlowCardCondition("state_value_condition");
		this.sarahStateValueCondition.register().registerRunListener(this.onSarahStateValueCondition.bind(this));
		this.sarahStateValueCondition.getArgument("zone").registerAutocompleteListener(this.onZoneAutocomplete.bind(this));
		this.sarahStateValueCondition.getArgument("group").registerAutocompleteListener(this.onGroupAutocomplete.bind(this));
		this.sarahStateValueCondition.getArgument("state").registerAutocompleteListener(this.onStateValueAutocomplete.bind(this));

		this.sarahStateEmitter = new Homey.FlowCardAction("state_emitter");
		this.sarahStateEmitter.register().registerRunListener(this.onSarahStateEmitter.bind(this));
		this.sarahStateEmitter.getArgument("zone").registerAutocompleteListener(this.onZoneAutocomplete.bind(this));
		this.sarahStateEmitter.getArgument("group").registerAutocompleteListener(this.onGroupAutocomplete.bind(this));
		this.sarahStateEmitter.getArgument("state").registerAutocompleteListener(this.onStateValueAutocomplete.bind(this));

		// Initialize sarah-home
		this.sarahInitListener.trigger().catch(err => this.error(`onInit() > ${err.message}`));
	}

	// Homey-App Loggers

	log(msg) {
		super.log(msg);
		// Send to logger
		if (this.appLogListener) {
			this.appLogListener.trigger({ name: `${Homey.app.manifest.name.en}`, msg: msg }).catch(err => super.error(err.message));
		}
	}

	error(msg) {
		super.error(`### ${msg}`);
		// Send to error logger
		if (this.appErrorListener) {
			this.appErrorListener.trigger({ name: `${Homey.app.manifest.name.en}`, msg: msg }).catch(err => super.error(err.message));
		}
	}

	debug(msg) {
		super.log(`»»» ${msg}`);
		// Send to debug logger
		if (this.appDebugListener) {
			this.appDebugListener.trigger({ name: `${Homey.app.manifest.name.en}`, msg: msg }).catch(err => super.error(err.message));
		}
	}

	// Sarah-Events

	async onSarahEventListener(args, state) {
		const isMatch = args.zone.id === state.zone.id && args.group.name === state.group.name && args.event.event === state.event.event;

		if (isMatch) {
			this.debug(`Event matched -> ${state.zone.name}::${state.group.name} #${state.event.event}(${state.args})`);
		}

		return Promise.resolve(isMatch);
	}

	async onSarahEventEmitter(args, state) {
		const sArgs = { ...args };
		sArgs.args = sArgs.args || "";
		sArgs.event = this.getSarahConfEvent(sArgs);

		// Generate unique event-Id
		sArgs.event.id = require("crypto")
			.randomBytes(64)
			.toString("base64");

		this.debug(`Event fired -> ${sArgs.zone.name}::${sArgs.group.name} #${sArgs.event.event}(${sArgs.args})`);

		this.sarahEventListener
			.trigger({ args: sArgs.args }, sArgs)
			.then(
				function() {
					if (Object.keys(sArgs.event.state).length > 0) {
						sArgs.state = {
							name: sArgs.event.state.state,
							state: sArgs.event.state.state,
							value: sArgs.event.state.value
						};
						this.onSarahStateEmitter(sArgs, sArgs);
					}
				}.bind(this)
			)
			.catch(err => this.error(`onSarahEventEmitter() > ${err.message}`));

		return Promise.resolve(true);
	}

	// Sarah-States

	async onSarahStateListener(args, state) {
		const isMatch = args.zone.id === state.zone.id && args.group.name === state.group.name && args.state.state === state.state.state;

		if (isMatch) {
			this.debug(`State matched -> ${state.zone.name}::${state.group.name}::${state.state.state} [${state.state.value}]`);
		}

		return Promise.resolve(isMatch);
	}

	async onSarahStateValueListener(args, state) {
		const isMatch =
			args.zone.id === state.zone.id &&
			args.group.name === state.group.name &&
			args.state.state === state.state.state &&
			args.state.value === state.state.value;

		if (isMatch) {
			this.debug(`State-Value matched -> ${state.zone.name}::${state.group.name}::${state.state.state} = ${state.state.value}`);
		}

		return Promise.resolve(isMatch);
	}

	async onSarahStateValueCondition(args) {
		const state = this.getCurrentState(args);
		const isMatch = args.state.value === state.state.value;

		if (isMatch) {
			this.debug(`State-Value condition -> ${args.zone.name}::${args.group.name}::${args.state.state} === ${state.state.value}`);
		}

		return Promise.resolve(isMatch);
	}

	async onSarahStateEmitter(args) {
		const merge = (target, source) => {
			// Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
			for (let key of Object.keys(source)) {
				if (source[key] instanceof Object && key in target) Object.assign(source[key], merge(target[key], source[key]));
			}

			// Join `target` and modified `source`
			Object.assign(target || {}, source);
			return target;
		};

		const state = this.getCurrentState(args);

		// Emit event & set new state
		if (args.state.value !== state.state.value) {
			this.debug(
				`State changed -> ${args.zone.name}::${args.group.name}::${args.state.state} "${state.state.value}" > "${args.state.value}" event: #${
					args.event.event
				}(${args.args})`
			);

			// Set [new] current state value
			state.state.value = args.state.value;
			this.currentStates = merge(this.currentStates, { [args.zone.id]: { [args.group.name]: { [args.state.state]: args.state } } });

			// Publish all current states to settings
			let cStates = [];
			let zones = await this.getZones();
			for (let zoneID in this.currentStates) {
				for (let groupName in this.currentStates[zoneID]) {
					for (let stateName in this.currentStates[zoneID][groupName]) {
						let zone = zones[zoneID];
						let state = this.currentStates[zoneID][groupName][stateName];
						let gIdx = !zone.parent
							? this.settings.sarahGroups._home_.findIndex(n => n === groupName)
							: this.settings.sarahGroups._zones_.findIndex(n => n === groupName);
						//v2 cStates.push({ zIdx: zone.order, zone: zone.name, gIdx: gIdx, group: groupName, state: state.state, value: state.value });
						cStates.push({ zIdx: zone.index, zone: zone.name, gIdx: gIdx, group: groupName, state: state.state, value: state.value });
					}
				}
			}
			Homey.ManagerSettings.set("currentStates", cStates);

			// Emit...
			this.sarahStateListener
				.trigger({ value: state.state.value }, state)
				.then(this.sarahStateValueListener.trigger({ value: state.state.value }, state))
				.catch(err => this.error(`onSarahStateEmitter() > ${err.message}`));
		}

		return Promise.resolve(true);
	}

	// Common

	async onZoneAutocomplete(query, args) {
		//v2 let zones = Object.values(await this.getZones()).sort((a, b) => a.order > b.order);
		let zones = Object.values(await this.getZones()).sort((a, b) => a.index > b.index);

		return Promise.resolve(zones.filter(zone => zone.name.toLowerCase().indexOf(query.toLowerCase()) > -1));
	}

	onGroupAutocomplete(query, args) {
		let groups = Object.keys(this.getSarahConfGroups(args.zone));

		let result = groups.map(group => {
			return { name: group };
		});

		return Promise.resolve(result.filter(group => group.name.toLowerCase().indexOf(query.toLowerCase()) > -1));
	}

	onEventAutocomplete(query, args) {
		let events = [];

		Object.values(this.getSarahConfEvents(args.zone, args.group)).forEach(each => {
			events.push({
				name: each.event,
				event: each.event,
				state: each.state || {}
			});
		});

		return Promise.resolve(events.filter(each => each.event.toLowerCase().indexOf(query.toLowerCase()) > -1));
	}

	onStateAutocomplete(query, args) {
		let states = [];

		Object.values(this.getSarahConfStates(args.zone, args.group)).forEach(each => {
			states.push({
				name: each.state,
				state: each.state
			});
		});

		return Promise.resolve(states.filter(state => state.state.toLowerCase().indexOf(query.toLowerCase()) > -1));
	}

	onStateValueAutocomplete(query, args) {
		let states = [];

		Object.values(this.getSarahConfStates(args.zone, args.group)).forEach(aState => {
			let state = aState;
			state.values.forEach(value => {
				states.push({
					name: `${state.state} > ${value}`,
					state: state.state,
					value: value
				});
			});
		});

		return Promise.resolve(states.filter(state => state.state.toLowerCase().indexOf(query.toLowerCase()) > -1));
	}

	async getApi() {
		if (!this._api) {
			this._api = await HomeyAPI.forCurrentHomey();
		}
		return this._api;
	}

	async getZones() {
		try {
			const api = await this.getApi();
			return await api.zones.getZones();
		} catch (err) {
			this.error(`getZones() > ${err.message}`);
		}
	}

	getSarahConfGroups(zone) {
		const sarahConf = this.settings.sarahConf;
		let groups;

		if (zone.parent === "false") {
			groups = zone.id in sarahConf ? sarahConf[zone.id] : {};
		} else {
			let gA = "_zones_" in sarahConf ? sarahConf["_zones_"] : {};
			let gB = zone.id in sarahConf ? sarahConf[zone.id] : {};
			groups = Object.assign({}, gA, gB);
		}
		return groups;
	}

	getSarahConfStates(zone, group) {
		const sarahConf = this.settings.sarahConf;
		let states;

		if (zone.parent === "false") {
			states = zone.id in sarahConf && group.name in sarahConf[zone.id] ? sarahConf[zone.id][group.name].states || [] : [];
		} else {
			let sA = "_zones_" in sarahConf && group.name in sarahConf["_zones_"] ? sarahConf["_zones_"][group.name].states || [] : [];
			let sB = zone.id in sarahConf && group.name in sarahConf[zone.id] ? sarahConf[zone.id][group.name].states || [] : [];
			states = Object.assign([], [...sA, ...sB]);
		}

		return states;
	}

	getSarahConfEvents(zone, group) {
		const sarahConf = this.settings.sarahConf;
		let events;

		if (zone.parent === "false") {
			events = zone.id in sarahConf && group.name in sarahConf[zone.id] ? sarahConf[zone.id][group.name].events || [] : [];
		} else {
			let eA = "_zones_" in sarahConf && group.name in sarahConf["_zones_"] ? sarahConf["_zones_"][group.name].events || [] : [];
			let eB = zone.id in sarahConf && group.name in sarahConf[zone.id] ? sarahConf[zone.id][group.name].events || [] : [];
			events = Object.assign([], [...eA, ...eB]);
		}
		return events;
	}

	getSarahConfEvent(args) {
		let event = { state: {} };
		Object.assign(event, this.getSarahConfEvents(args.zone, args.group).filter(event => event.event === args.event.event)[0]);

		return event;
	}

	getCurrentState(args) {
		const state = { ...args };
		state.state = {};

		try {
			// Get current state (if exist)
			Object.assign(state.state, this.currentStates[args.zone.id][args.group.name][args.state.state]);
		} catch (e) {
			// Get sarahConf state
			Object.assign(state.state, this.getSarahConfStates(args.zone, args.group).filter(state => state.state === args.state.state)[0]);
		}

		return state;
	}

	async initSettings() {
		const settings = require("./default.json");
		const zones = Object.values(await this.getZones());

		for (let key in settings.sarahConf) {
			let zone;

			switch (key) {
				case "_home_":
					zone = zones.find(zone => !zone.parent);
					delete Object.assign(settings.sarahConf, { [zone.id]: settings.sarahConf[key] })[key];
					break;
				case "_zones_":
					break;
				default:
					zone = zones.find(zone => zone.name === key);
					delete Object.assign(settings.sarahConf, { [zone.id]: settings.sarahConf[key] })[key];
			}
		}
		this.settings = settings;

		return;
	}
}

module.exports = SarahApp;
