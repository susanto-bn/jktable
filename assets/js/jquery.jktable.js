/*
 * jktable
 *	
		$("#testjkt").jktable({
			data : management.data,
			primary: "id",
			fields : [
						// {
							// header: "No",
							// data: "$index()"
						// },
						{
							header: "ID",
							data: "id",
							searchable: true
						},
						{
							header: "Name",
							data: "name",
							searchable: true,
							sortable: true,
							cssClass: ""
						},
						{
							header: "Action",
							buttons: ["edit","delete"]
						}
					],
			realtimeSearch : false,
			editButton: {
				click: "editClick",
				visible: true
			},
			deleteButton: {
				click: "deleteClick",
				visible: " id() % 2 == 1"
			},
			insertButton: {
				text: "Create User",
				click: management.addDataClick
			},
			displayTotalData: true,
			pagination: true
		});
 */
var jktable = function(setting) {
	var _self = this;
	
	var replaceTargetValue = function( input, target) {
		jQuery.each( target, function( key, targetVal ) {
			if( jQuery.type( input[key] ) != "undefined" ) {
				if(jQuery.type( input[key] ) == "boolean") {
					if(jQuery.type( targetVal ) == "object" && jQuery.type( targetVal.enable ) != "undefined" ) {
						target[key].enable = input[key];
					} else {
						target[key] = input[key];
					}
				} else {
					if(jQuery.type( target[key] ) == "object" ) {
						replaceTargetValue( input[key], target[key] );
					} else {
						target[key] = input[key];
					}
				}
			}
		})
	};
	var field = {
		header: "",
		data: "",
		usehtml: false,
		searchable: false // true/false, or search from other data
	};
	var _setting = {
		data: ko.observableArray(),
		primary: "",
		fields: [],
		ajax : {
			url: "",
			requestOnChangePage: false,
			pipeline: false,
			type: "POST"
		},
		realtimeSearch : false,
		datalength : 0,
		insertButton: false,
		editButton: false,
		deleteButton: false,
		displayTotalData: true,
		pagination : {
			enable: false,
			pageSizeOptions : [10,25,50,100],
			pageSize : 2,
			displayPageNo : false,
			pageIndex : 0
		},
		header: {
			elem: "div",
			cssClass: "jkt-header",
			left: {
				elem: "div",
				cssClass: "jkt-headerLeft",
				visible: "maxPage() > 1"
			},
			right: {
				elem: "div",
				cssClass: "jkt-headerRight",
				visible: true
			}
		},
		table: {
			width: "100%",
			cssClass: "table",
			cellspacing: 0, 
			cellpadding: 5, 
			head: {
				elem: "thead",
				click: "",
				row: {
					elem: "tr",
					click: ""
				},
				col: {
					elem: "th",
					click: ""
				}
			},
			body: {
				elem: "tbody",
				click: "",
				bind: "displayPage",
				row: {
					elem: "tr",
					click: ""
				},
				col: {
					elem: "td",
					click: ""
				}
			}
		}
	};
	
	var _jktableVM = {
		data: ko.observableArray(),
		datalength: ko.observable(0),
		fields: {},
		fieldsSearchable: {},
		fieldsSortable: {},
		pageSize: ko.observable(),
		pageSizeOptions: [],
		pageIndex: ko.observable(0)
	};	
	_jktableVM.sortChange= function(itm) {
		alert('');
	};
	_jktableVM.displayData = function() {
		var displayData = [];
		if (!_jktableVM.fieldsSearchable) {
			displayData = _jktableVM.data()
		} else {
			displayData = ko.utils.arrayFilter(_jktableVM.data(), function(item) {
				var ret = true;
				jQuery.each( _jktableVM.fieldsSearchable, function( searchKey, searchVal ){
					var itm = jQuery.isFunction( item[searchKey] ) ? item[searchKey]() : item[searchKey];
					itm = (itm == null || jQuery.type(itm) == "undefined" ? "" : itm);
					if(searchVal()){
						if(jQuery.type( itm ) == "string" ) {
							if (itm.toLowerCase().indexOf(searchVal().toLowerCase()) == -1) {
								ret = false;
								return false;
							}
						} else if( jQuery.type( itm ) === "number"){
							if (itm != searchVal()) {
								ret = false;
								return false;
							}							
						}
					}
				});
				return ret;
			});
		};
		
		if (_jktableVM.fieldsSortable) {
			displayData.sort(function(a,b){
				var sortStatus = 0;
				jQuery.each( _jktableVM.fieldsSortable, function( sortKey, sortVal ){
					if(sortVal.order() > 0) {
						var itmA, itmB;
						if(jQuery.isFunction( a[sortKey] ) ) {
							itmA = a[sortKey]();
							itmB = b[sortKey]();
						} else {
							itmA = a[sortKey];
							itmB = b[sortKey];
						};
						
						var valA = (itmA == null || jQuery.type(itmA) == "undefined"? "" : itmA);
						var valB = (itmB == null || jQuery.type(itmB) == "undefined"? "" : itmB);
						if(jQuery.type( valA ) == "string" ) {
							valA = jQuery.trim(valA.toLowerCase());
						};
						if(jQuery.type( valB ) == "string" ) {
							valB = jQuery.trim(valB.toLowerCase());
						};
						if(valA == valB){
							// equal so need to compare with another criteria
						} else {
							if(sortVal.order() == 1) { //asc
								if (isNaN(itmA) || isNaN(itmB)) {
									sortStatus = valA > valB ? 1 : -1;
								} else {
									sortStatus = valA - valB;
								}
							} else if(sortVal.order() == 2) { // desc
								if (isNaN(itmA) || isNaN(itmB)) {
									sortStatus = valB > valA ? 1 : -1;
								} else {
									sortStatus = valB - valA;
								}
							};
							return false;
						}
					}
				});
				return sortStatus;
			})
		};
		return displayData;
	};
	_jktableVM.maxPage = function(){
		var displayData = _jktableVM.displayData();
		var pageSize = _jktableVM.pageSize();
		return Math.ceil(
			displayData.length / pageSize
		)
	};
	_jktableVM.pageNoOptions = function(){
		var pageNoOptions = [];
		var maxPage = _jktableVM.maxPage();
		for(var pageNo = 1; pageNo < maxPage + 1 ; pageNo++){
			pageNoOptions.push( pageNo );
		};
		return pageNoOptions;
	};
	_jktableVM.maxPrimary = function(){
		var data = _jktableVM.data();
		return Math.max.apply(Math,
			jQuery.map( data, function( val, key ) {
				return jQuery.isFunction( val[_setting.primary] ) ? val[_setting.primary]() : val[_setting.primary];
			})
		)
	};
	_jktableVM.displayPage = function () {
		if(_pagination.enable) {
			var pageSize = _jktableVM.pageSize();
			var pageIndex = _jktableVM.pageIndex();
			var startIndex = pageSize * (pageIndex - 1);
			return _jktableVM.displayData().slice(startIndex, startIndex + pageSize);
		} else {
			return _jktableVM.displayData();
		}
	};
	_jktableVM.insertButtonClick = function() { };
	_jktableVM.gotoFirstPage = function() { _jktableVM.pageIndex(1) };
	_jktableVM.gotoPrevPage = function() { _jktableVM.pageIndex( _jktableVM.pageIndex() - 1 )};
	_jktableVM.gotoNextPage = function() { _jktableVM.pageIndex( _jktableVM.pageIndex() + 1) };
	_jktableVM.gotoLastPage = function() { _jktableVM.pageIndex( _jktableVM.maxPage() ) };
	
	var _insertButton = {
		width: "100%",
		cssClass: "jkt-insertButton",
		textClass: "", 
		text: "Add New",
		click:	function() { }
	};
	
	var _editButton = {
		cssClass: "jkt-Button jkt-editButton",
		text: "",
		click: "",
		visible: true
	};
	
	var _deleteButton = {
		cssClass: "jkt-Button jkt-deleteButton",
		text: "",
		click: "",
		visible: true
	};
	
	// var _searchButton = {
		// class: "jkt-Button jkt-searchButton",
		// text: "",
		// click: "",
		// visible: true
	// };
	
	var _ascButton = {
		cssClass: "jkt-sortButton jkt-ascButton"
	};
	var _descButton = {
		cssClass: "jkt-sortButton jkt-descButton"
	};
	var _sortableButton = {
		cssClass: "jkt-sortButton jkt-sortableButton"
	};
	
	var _firstButton = {
		cssClass: "jkt-pageButton jkt-firstButton",
		textClass: "", 
		text: "<<",
		visible: "pageIndex() > 1",
		click: "gotoFirstPage"
	};
	var _prevButton = {
		cssClass: "jkt-pageButton jkt-prevButton",
		textClass: "", 
		text: "<",
		visible: "pageIndex() > 1",
		click: "gotoPrevPage"
	};
	var _nextButton = {
		cssClass: "jkt-pageButton jkt-nextButton",
		textClass: "", 
		text: ">",
		visible: " pageIndex() < maxPage()",
		click: "gotoNextPage"
	};
	var _lastButton = {
		cssClass: "jkt-pageButton jkt-lastButton",
		textClass: "", 
		text: ">>",
		visible: " pageIndex() < maxPage() ",
		click: "gotoLastPage"
	};
	
	var _ajaxRequest = function() {
		var ret = false;
		var formData = {};
		jQuery.each( _jktableVM.fieldsSearchable, function( searchKey, searchVal ){
			var itm = jQuery.isFunction( item[searchKey] ) ? item[searchKey]() : item[searchKey];
			formData[searchKey] = itm;
		});
		formData["pageSize"] = _jktableVM.pageSize();
		formData["pageIndex"] = _jktableVM.pageIndex();
		formData["maxPrimary"] = _jktableVM.maxPrimary();
		$.ajax({
			async : false,
			url : _setting.ajax,
			type : "POST",
			data : formData,
			format : "json",
			success : function(data) {
				ret = data;
			}
		});
		return ret;
	};
	
	var _pagination = _setting.pagination;
	var _header = _setting.header;
	var _table = _setting.table;

	
	// if(jQuery.type( setting ) == "object"||"undefined" ) {
		//jkt setting
		if(jQuery.type( setting ) == "object" ) {
			replaceTargetValue( setting, _setting )
		};
		if(jQuery.type( setting.data ) != "undefined" ) { // arraydata
			_jktableVM.data = _setting.data;
			_jktableVM.datalength = ko.computed(function() {
				return _jktableVM.data().length
			})
		} else { // ajax
			_jktableVM.datalength( _pagination.datalength );
			_jktableVM.maxPage = ko.computed(function(){
				return Math.ceil(
					_jktableVM.datalength() / _jktableVM.pageSize()
				)
			},_jktableVM)
		};
		_jktableVM.pageSize(_pagination.pageSize);
		_jktableVM.pageSizeOptions = _pagination.pageSizeOptions;
		if(_jktableVM.pageSizeOptions.indexOf( _jktableVM.pageSize() ) < 0 ) {
			_jktableVM.pageSizeOptions.push( _jktableVM.pageSize() )
		};
		_jktableVM.pageSizeOptions.sort(function(a,b){return a-b});
		
		// _jktableVM.fields		
		jQuery.each( _setting.fields, function( attrName, attrVal ) {
			if(attrVal.data) {
				_jktableVM.fields[attrVal.data] = ko.observable("");
			}
		});
		
		// _editButton
		if( _setting.editButton ) {
			if(jQuery.type( _setting.editButton ) == "object" ) {
				jQuery.each( _editButton, function( attrName, attrVal ) {
					if( _setting.editButton[attrName] ) {
						_editButton[attrName] = _setting.editButton[attrName];
					}
				})
			}
		};
		
		// _deleteButton
		if( _setting.deleteButton ) {
			if(jQuery.type( _setting.deleteButton ) == "object" ) {
				jQuery.each( _deleteButton, function( attrName, attrVal ) {
					if( _setting.deleteButton[attrName] ) {
						_deleteButton[attrName] = _setting.deleteButton[attrName];
					}
				})
			}
		};
			
		// Generate Table
		var _jktable = jQuery("<table>");
		jQuery.each( _table, function( attrName, attrVal ) {
			if(attrName == "cssClass") {
				_jktable.addClass( attrVal )
			} else {
				_jktable.attr( ""+attrName, attrVal )
			}
		});
		// Generate fields
		if(_setting.fields.length > 0){
			var _head = jQuery("<"+_table.head.elem+">");
			var _rowhead = jQuery("<"+_table.head.row.elem+">");
			var _body = jQuery("<"+_table.body.elem+">");
			if( _table.body.bind != "") {
				_body.attr("data-bind", [ "foreach : " + _table.body.bind ] )
			};
			var _rowbody = jQuery("<"+_table.body.row.elem+">");
			if( _table.body.row.click != "") {
				_rowbody.attr("data-bind", [ "click: " + _table.body.row.click ] )
			};
			jQuery.each( _setting.fields, function( colN, colSetting ){
				var _colhead = jQuery("<"+_table.head.col.elem+">");
				if(colSetting.header != "" ) {
					_colhead.append( jQuery("<label>").text( colSetting.header ) )
				};
				var _colbody = jQuery("<"+_table.body.col.elem+">");
				if( jQuery.type( colSetting.width ) != "undefined" ) {
					_colhead.width( colSetting.width );
					_colbody.width( colSetting.width )
				};
				if(colSetting.data) {
					var sortablebind = "";
					var orderDefault = 0;
					if(jQuery.type( colSetting.sortable ) === "boolean") {
						if(colSetting.sortable) {
							sortablebind = colSetting.data;
						}
					} else if(jQuery.type( colSetting.sortable ) === "string") {
						sortablebind = colSetting.sortable;
					} else if(jQuery.type( colSetting.sortable ) === "number") {
						sortablebind = colSetting.data;
						orderDefault = colSetting.sortable;
					};
					if(sortablebind != "") {
						_jktableVM.fieldsSortable[sortablebind] = {
							order: ko.observable(orderDefault),
							change: function(){
								jQuery.each( _jktableVM.fieldsSortable, function( fieldSortableName, fieldSortableVal ) {
									if( fieldSortableName == sortablebind) {
										fieldSortableVal.order( fieldSortableVal.order() + 1 );
										if( fieldSortableVal.order() > 2 ){
											fieldSortableVal.order(1)
										}
									} else {
										fieldSortableVal.order(0)
									}
								})
							}
						};
						_jktableVM.fieldsSortable[sortablebind].cssClass = ko.computed(function(){
							if( _jktableVM.fieldsSortable[sortablebind].order() == 0 ){
								return _sortableButton.cssClass;
							} else if( _jktableVM.fieldsSortable[sortablebind].order() == 1 ){
								return _ascButton.cssClass;
							} else if( _jktableVM.fieldsSortable[sortablebind].order() == 2 ){
								return _descButton.cssClass;
							}
						}, _jktableVM.fieldsSortable[sortablebind]);
						_colhead.append("&nbsp;");
						_colhead.append( jQuery("<button>")
											.attr("data-bind", [ 
												"click: fieldsSortable." + sortablebind + ".change",
												"attr: {'class': fieldsSortable." + sortablebind + ".cssClass }"
											]) 
										)
					};
					
					var searchablebind = "";
					if(jQuery.type( colSetting.searchable ) === "boolean") {
						if(colSetting.searchable) {
							searchablebind = colSetting.data;
						}
					} else if(jQuery.type( colSetting.searchable ) === "string") {
						searchablebind = colSetting.searchable;
					};
					if(searchablebind != "") {
						_jktableVM.fieldsSearchable[searchablebind] = ko.observable("");
						if(_colhead.html() != "") {
							_colhead.append("<br/>")
						};
						var bind = [ "value: fieldsSearchable." + searchablebind ];
						if( _setting.realtimeSearch ) {
							bind.push("valueUpdate: 'afterkeydown'")
						};
						_colhead.append( jQuery("<input>").attr("data-bind", bind ) )
					};
					
					var usehtml = false;
					if(jQuery.type( colSetting.usehtml ) === "boolean") {
						usehtml = colSetting.usehtml;
					};
					
					// _colbody.attr("data-bind", [ "text: " + colSetting.data ] );
					if( usehtml ) {
						_colbody.append( jQuery("<div>").addClass("data").attr("data-bind", [ "html: " + colSetting.data ] ) );
					} else {
						_colbody.append( jQuery("<div>").addClass("data").attr("data-bind", [ "text: " + colSetting.data ] ) );
					};
					_colbody.addClass( colSetting.cssClass );
				} else if(colSetting.buttons) {
					jQuery.each( colSetting.buttons, function( buttonN, buttonName ){
						if(buttonName.toLowerCase() == "edit") {
							_colbody.append( jQuery("<button>")
											.addClass( _editButton.cssClass )
											.text( _editButton.text )
											.attr("data-bind", [ "click: " + _editButton.click, "visible: " + _editButton.visible ] ) 
										)
						} else if(buttonName.toLowerCase() == "delete") {
							_colbody.append( jQuery("<button>")
											.addClass( _deleteButton.cssClass )
											.text( _deleteButton.text )
											.attr("data-bind", [ "click: " + _deleteButton.click, "visible: " + _deleteButton.visible ] ) 
										)
						}
					})
				};
				_rowhead.append( _colhead );
				_rowbody.append( _colbody )
			});
			_head.append( _rowhead );
			_body.append( _rowbody );
			if( _setting.insertButton ) {
				if(jQuery.type( _setting.insertButton ) == "object" ) {
					jQuery.each( _insertButton, function( attrName, attrVal ) {
						if(_setting.insertButton[attrName]) {
							_insertButton[attrName] = _setting.insertButton[attrName];
						}
					})
				};
				_jktableVM.insertButtonClick = _insertButton.click;
				var _rowInsert = jQuery("<"+_table.head.row.elem+">")
										.append(
											jQuery("<"+_table.head.col.elem+">")
												.attr( "colspan", _setting.fields.length )
												.append(
													jQuery("<button>")
														.addClass( _insertButton.cssClass )
														.css( "width", _insertButton.width )
														.attr( "data-bind", [ "click: insertButtonClick" ] )
														.append(
															jQuery("<span>")
																.addClass( _insertButton.textClass )
																.text( _insertButton.text )
														)
												)
										);
				_head.append( _rowInsert );
			};
			
			_jktable.append( _head );
			_jktable.append( _body );
		};
		
		var _divHeaderLeft = jQuery("<"+_header.left.elem+">").addClass(_header.left.cssClass).attr( "data-bind", [ "visible: " + _header.right.visible ] );
		var _divHeaderRight = jQuery("<"+_header.right.elem+">").addClass(_header.right.cssClass).attr( "data-bind", [ "visible: " + _header.right.visible ] );
		if(_setting.displayTotalData) {
			_divHeaderRight.append("Total items : ").append( 
				jQuery("<span>").attr( "data-bind", [ "text: datalength" ] ) 
			).append(", Filtered items : ").append( 
				jQuery("<span>").attr( "data-bind", [ "text: displayData().length" ] ) 
			)
		};
		if(_setting.pagination.enable) {
			var selectPageSizeOptions = jQuery("<select>");
			selectPageSizeOptions.attr("data-bind", [
											"options: pageSizeOptions",
											"value: pageSize"
										]);
			_divHeaderLeft.append( "Item per Page " )
							.append( selectPageSizeOptions );
			
			var _divHeaderPagination = jQuery("<div>").attr( "data-bind", [ "visible: maxPage() > 1" ] );
			var selectPageNoOptions = jQuery("<select>");
			selectPageNoOptions.attr("data-bind", [
											"options: pageNoOptions",
											"value: pageIndex"
										]);
		
			_divHeaderPagination.append( "Page " )
							.append( selectPageNoOptions )
							.append( " of " )
							.append( jQuery("<label>").attr("data-bind", [
								"text: maxPage"
							]));
			//_divHeaderPagination.append( "<br/>" );
			_divHeaderPagination.append( "&nbsp;&nbsp;&nbsp;&nbsp;" );
			_divHeaderPagination.append( jQuery("<button>")
									.addClass( _firstButton.cssClass )
									.attr( "data-bind", 
										["click: " + _firstButton.click, "visible: " + _firstButton.visible]
									)
								);
			_divHeaderPagination.append( jQuery("<button>")
									.addClass( _prevButton.cssClass )
									.attr( "data-bind", 
										["click: " + _prevButton.click, "visible: " + _prevButton.visible]
									)
								);
			_divHeaderPagination.append( jQuery("<button>")
									.addClass( _nextButton.cssClass )
									.attr( "data-bind", 
										["click: " + _nextButton.click, "visible: " + _nextButton.visible]
									)
								);
			_divHeaderPagination.append( jQuery("<button>")
									.addClass( _lastButton.cssClass )
									.attr( "data-bind", 
										["click: " + _lastButton.click, "visible: " + _lastButton.visible]
									)
								);
			if(_divHeaderLeft.html() != "") {
				_divHeaderLeft.append("<br/>")
			};
			_divHeaderLeft.append( _divHeaderPagination )
		};
		jQuery(this).append( jQuery("<"+_header.elem+">").addClass( _header.cssClass ).append(_divHeaderLeft).append(_divHeaderRight) );
		
		_jktableVM.displayData = ko.computed(_jktableVM.displayData,_jktableVM);
		_jktableVM.maxPage = ko.computed(_jktableVM.maxPage,_jktableVM);
		_jktableVM.pageNoOptions = ko.computed(_jktableVM.pageNoOptions,_jktableVM);
		_jktableVM.maxPrimary = ko.computed(_jktableVM.maxPrimary,_jktableVM);
		_jktableVM.displayPage = ko.computed(_jktableVM.displayPage, _jktableVM);
					
		jQuery(this).append(_jktable);
		
		ko.cleanNode( jQuery(this)[0] );
		ko.applyBindings( _jktableVM, jQuery(this)[0] );
		
		_self.jktableVM = _jktableVM;
		_self.jktableSetting = _setting;
		
		return _jktableVM;
	// }
};

jQuery.fn.jktable = jktable;