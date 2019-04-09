let settings;

let currentStatesTable;
let sarahEventTable;

let illegalValue = false;

function onHomeyReady(HomeyReady) {
	Homey = HomeyReady;

	$(document).ready(function() {
		currentStatesTable = $("#currentStates").DataTable({
			columns: [{ data: "zIdx" }, { data: "zone" }, { data: "gIdx" }, { data: "group" }, { data: "state" }, { data: "value" }],
			columnDefs: [{ targets: [0, 2], orderData: [0, 2], orderSequence: ["asc"], visible: false }, { targets: ["_all"], orderable: false }],
			searching: false,
			paging: false,
			info: false
		});
		sarahEventTable = $("#sarahEvents").DataTable({
			searching: false,
			paging: false,
			ordering: false,
			info: false
		});
	});

	Homey.get("settings", (err, values = {}) => {
		if (err) return Homey.alert(err, error);
		settings = values;
		$('#configJson').text(JSON.stringify(settings,null,'\t'));
	});

	Homey.get("currentStates", (err, cStates) => {
		if (err) return Homey.alert(err, error);
		currentStatesTable
			.clear()
			.rows.add(cStates) 
			.draw();

		Homey.on("currentStates", (err, cStates) => {
			console.log(">:", cStates);
			if (err) return Homey.alert(err, error);
			currentStatesTable
				.clear()
				.rows.add(cStates)
				.draw();
		});
	});
    showTab(1);
	Homey.ready();
}

// Temp - until Homey.on() is working
function refreshCurrentStates() {
	Homey.get("currentStates", function(err, cStates) {
		if (err) return Homey.alert(err, error);
		currentStatesTable
			.clear()
			.rows.add(cStates)
			.draw();
	});
}

function showTab(tab){
    loading = false
    document.getElementById("tabs").style.display = "inline";
    if ( illegalValue ) {
        illegalValue = false;
        return;
    }
    $('.tab').addClass('tab-inactive')
    $('.tab').removeClass('tab-active')

    $('#tabb' + tab).addClass('tab-active')
    $('#tabb' + tab).removeClass('tab-inactive')

    $('.panel').hide()
    $('#tab' + tab).show()
    dashboardVisible = ( tab == 1 ) ? true : false
    statusVisible = ( tab == 2 ) ? true : false    
}