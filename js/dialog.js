'use strict';

(function() {
    $(function() {
        tableau.extensions.initializeDialogAsync().then(function (openPayload) {
            buildDialog();
        })
    });

    // build the dialog box
    function buildDialog() {
        // get settings values if they exist
        var mainWorksheet = tableau.extensions.settings.get("mainWorksheet");
        var lookupWorksheet = tableau.extensions.settings.get("lookupWorksheet");
        var usernameCol = tableau.extensions.settings.get("usernameCol");
        var newRows = tableau.extensions.settings.get("newRows");
        var delRows = tableau.extensions.settings.get("delRows");
        var childParam = tableau.extensions.settings.get("childParam");
        var parentParam = tableau.extensions.settings.get("parentParam");
        var tableAlign = tableau.extensions.settings.get("tableAlign");
        var sfAccountId = tableau.extensions.settings.get("sfAccountId");
        var sfRefreshToken = tableau.extensions.settings.get("sfRefreshToken");
        var sfClientId = tableau.extensions.settings.get("sfClientId");
        var sfClientSecret = tableau.extensions.settings.get("sfClientSecret");
        var sfRedirectUrl = tableau.extensions.settings.get("sfRedirectUrl");
        var sfDatabase = tableau.extensions.settings.get("sfDatabase");
        var sfSchema = tableau.extensions.settings.get("sfSchema");
        var sfWarehouse = tableau.extensions.settings.get("sfWarehouse");
        var sfRole = tableau.extensions.settings.get("sfRole");
        var sfEntity = tableau.extensions.settings.get("sfEntity");

        // get main dashboard item
        let dashboard = tableau.extensions.dashboardContent.dashboard;

        // populate the worksheet drop downs
        // first the main worksheet list
        dashboard.worksheets.forEach(function (worksheet) {
            if (mainWorksheet != undefined && worksheet.name == mainWorksheet) {
                $("#mainSheetList").append("<option value='" + worksheet.name + "' selected>" + worksheet.name + "</option>");
            } else {
                $("#mainSheetList").append("<option value='" + worksheet.name + "'>" + worksheet.name + "</option>");
            }
        });

        // then the lookup worksheet list
        dashboard.worksheets.forEach(function (worksheet) {
            if (lookupWorksheet != undefined ** worksheet.name == lookupWorksheet) {
                $("#lookupSheetList").append("<option value='" + worksheet.name + "' selected>" + worksheet.name + "</option>");
            } else {
                $("#lookupSheetList").append("<option value='" + worksheet.name + "'>" + worksheet.name + "</option>");
            }
        });

        // if the main worksheet has been defined, then update the list of fields for username and the unique cols
        if (mainWorksheet != undefined) {
            usernameListUpdate(mainWorksheet,false);
            uniqueColListUpdate(mainWorksheet,false);
        };

        // if the lookup worksheet has been defined update the list of fields used for lookups
        if (lookupWorksheet != undefined && mainWorksheet != undefined && usernameCol != undefined) {
            lookupListUpdate(lookupWorksheet,mainWorksheet,usernameCol,false);
        }

        // reset the field lists on main worksheet change
        $("#mainSheetList").on('change','', function() {
            var mSheet = $("#mainSheetList").val();
            usernameListUpdate(mSheet,true);
            uniqueColListUpdate(mSheet,true);
        });

        // reset the lookup fields on lookup sheet change
        $("#lookupSheetList").on('change','', function() {
            var lSheet = $("#lookupSheetList").val();
            var mSheet = $("#mainSheetList").val();
            var uCol = $("#usernameColumn").val();
            lookupListUpdate(lSheet,mSheet,uCol,true);
        });

        // if the username column changes then need to reset the lookups as long as the lookup worksheet has been defined
        $("#usernameColumn").on('change','', function() {
            var lkpSheet = $("#lookupSheetList").val();
            var mSheet = $("#mainSheetList").val();
            var uCol = $("#usernameColumn").val();
            if (lkpSheet != "" && lkpSheet != null) {
                lookupListUpdate(lkpSheet,mSheet,uCol,true);
            }
        });

        // if enable new/delete rows have been defined then check/uncheck as necessary
        if (newRows != undefined && newRows == "True") {
            $("#enableNewRow").prop("checked",true);
        }

        if (delRows != undefined && delRows == "True") {
            $("#enableDelRow").prop("checked",true);
        }

        // if the table alignment has been set then select the relevant value
        if (tableAlign != undefined) {
            $("#tableAlign").val(tableAlign);
        }

        // get dashboard parameters
        dashboard.getParametersAsync().then(function (params) {
            // if there are parameters, populate the child and parent parameter select lists
            // also, if either have been defined previously then set that value
            if (params != undefined && params.length > 0) {
                params.forEach(function (p) {
                    $("#childParam").append("<option value='" + p.name + "'>" + p.name + "</option>");
                    $("#parentParam").append("<option value='" + p.name + "'>" + p.name + "</option>");
                });
                if (childParam != undefined && childParam != null) {
                    $("#childParam").val(childParam);
                }
                if (parentParam != undefined && parentParam != null) {
                    $("#parentParam").val(parentParam);
                }
            }
        });

        // set snowflake settings if already set
        if (sfAccountId != undefined) {
            $("#snowflakeAccountId").val(sfAccountId);
        }
        if (sfClientId != undefined) {
            $("#snowflakeClientId").val(sfClientId);
        }
        if (sfClientSecret != undefined) {
            $("#snowflakeClientSecret").val(sfClientSecret);
        }
        if (sfDatabase != undefined) {
            $("#snowflakeDatabase").val(sfDatabase);
        }
        if (sfRedirectUrl != undefined) {
            $("#snowflakeRedirectUrl").val(sfRedirectUrl);
        }
        if (sfRefreshToken != undefined) {
            $("#snowflakeToken").val(sfRefreshToken);
        }
        if (sfRole != undefined) {
            $("#snowflakeRole").val(sfRole);
        }
        if (sfSchema != undefined) {
            $("#snowflakeSchema").val(sfSchema);
        }
        if (sfWarehouse != undefined) {
            $("#snowflakeWarehouse").val(sfWarehouse);
        }
        if (sfEntity != undefined) {
            $("#snowflakeEntity").val(sfEntity);
        }

        // set button functions
        $("#cancelButton").on("click", closeDialog);
        $("#saveButton").on("click", saveButton);
        $("#btn_authCode").on("click",getAuthCode);
        $("#btn_refreshToken").on("click",getRefreshToken);
    }

    function usernameListUpdate(mainWorksheet,isChange) {
        // try to get previously saved column for username
        var usernameCol = tableau.extensions.settings.get("usernameCol");

        // get dashboard and worksheet
        var dashboard = tableau.extensions.dashboardContent.dashboard;
        var worksheet = dashboard.worksheets.find(function (sheet) {
            return sheet.name === mainWorksheet;
        });

        // get 1 row of summary data just to get the field names
        worksheet.getSummaryDataAsync({ maxRows: 1}).then(function (sumdata) {
            // get columns
            var worksheetColumns = sumdata.columns;
            // reset username field list
            $("#usernameColumn").text("");
            $("#usernameColumn").append("<option selected disabled>-- Select the column containing the username --</option>");

            // loop over each column
            worksheetColumns.forEach(function (current_value) {
                if (usernameCol != undefined && current_value.fieldName == usernameCol && !isChange) {
                    $("#usernameColumn").append("<option value='" + current_value.fieldName + "' selected>" + current_value.fieldName + "</option>");
                } else {
                    $("#usernameColumn").append("<option value='" + current_value.fieldName + "'>" + current_value.fieldName + "</option>");
                }
            });
        });
    }

    function uniqueColListUpdate(mainWorksheet,isChange) {
        // try to get previously save list of unique columns
        var uniqueCols = tableau.extensions.settings.get("uniqueCols");

        // get dashboard and worksheet
        var dashboard = tableau.extensions.dashboardContent.dashboard;
        var worksheet = dashboard.worksheets.find(function (sheet) {
            return sheet.name === mainWorksheet;
        });

        // get 1 row of summary data just to get the field names
        worksheet.getSummaryDataAsync({ maxRows: 1}).then(function (sumdata) {
            // get columns
            var worksheetColumns = sumdata.columns;
            // reset unique columns field list
            $("#uniqueColumn").text("");
            $("#uniqueColumn").append("<option selected disabled>-- Select the column(s) that make each row unique --</option>");

            // loop over each column
            worksheetColumns.forEach(function (current_value) {
                $("#uniqueColumn").append("<option value='" + current_value.fieldName + "'>" + current_value.fieldName + "</option>");
            });

            // set any previously selected values if not a worksheet change
            if (uniqueCols != undefined && !isChange) {
                // turn uniqueCols string into an array
                var uColsArr = uniqueCols.split("|");
                $("#uniqueColumn").val(uColsArr);
            }
        });
    }

    function lookupListUpdate(lookupWorksheet,mainWorksheet,usernameColumn,isChange) {
        // try to get previously defined list of lookups, a 2-dimensional array ||columnName|LkpListName||
        var lookupCols = tableau.extensions.settings.get("lookupCols");
        // try to get previously defined list of read only and not null columns and exclude columns and filter columns
        var readOnlyCols = tableau.extensions.settings.get("readOnlyCols");
        var notNullCols = tableau.extensions.settings.get("notNullCols");
        var excludeCols = tableau.extensions.settings.get("excludeCols");
        var filterCols = tableau.extensions.settings.get("filterCols");

        // get dashboard and worksheet
        var dashboard = tableau.extensions.dashboardContent.dashboard;
        var lkpworksheet = dashboard.worksheets.find(function (sheet) {
            return sheet.name === lookupWorksheet;
        });

        

        // get list of lookup lists
        //var lkpNameArr = 
        lkpworksheet.getSummaryDataAsync().then(function (sumdata) {
            // find the column that has the lookup name
            var lkpNameIdx = sumdata.columns.find(column => column.fieldName === "Lookup Name").index;

            var colValues = [];

            sumdata.data.forEach(function(dataRow) {
                var lkpName = dataRow[lkpNameIdx].value;
                colValues.push(lkpName);
            });

            var lkpNameArr = colValues.filter((v, i, a) => a.indexOf(v) === i);

            //return uniqueColValues;

            // get main worksheet then loop through the columns that are NOT the username column
            var mWorksheet = dashboard.worksheets.find(function (sheet) {
                return sheet.name === mainWorksheet;
            });

            mWorksheet.getSummaryDataAsync({ maxRows: 1}).then(function (sumdata) {
                // get columns
                var mCols = sumdata.columns;
                // reset list of columns
                $("#settingTableColRows").text("");
                //$("#lookupColumns").text("");
    
                // loop over each column
                mCols.forEach(function (current_value) {
                    if (current_value.fieldName != usernameColumn) {

                        $("#settingTableColRows").append("<tr id='tr_col_" + current_value.fieldName + "'></tr>");
                        $("[id='tr_col_" + current_value.fieldName + "']").append("<td>" + current_value.fieldName + "</td>");
                        $("[id='tr_col_" + current_value.fieldName + "']").append("<td style='text-align: center;'><input type='checkbox' id='ro_" + current_value.fieldName + "' class='form-check-input'></td>");
                        $("[id='tr_col_" + current_value.fieldName + "']").append("<td style='text-align: center;'><input type='checkbox' id='nn_" + current_value.fieldName + "' class='form-check-input'></td>");
                        $("[id='tr_col_" + current_value.fieldName + "']").append("<td style='text-align: center;'><input type='checkbox' id='ex_" + current_value.fieldName + "' class='form-check-input'></td>");
                        $("[id='tr_col_" + current_value.fieldName + "']").append("<td style='text-align: center;'><input type='checkbox' id='fl_" + current_value.fieldName + "' class='form-check-input'></td>");
                        $("[id='tr_col_" + current_value.fieldName + "']").append("<td style='text-align: center;'><input type='checkbox' id='chk_" + current_value.fieldName + "' class='form-check-input'></td>");
                        $("[id='tr_col_" + current_value.fieldName + "']").append("<td><select id='sel_" + current_value.fieldName + "' class='form-select' disabled></td>");
                        // loop over each lookup list and add as an option
                        lkpNameArr.forEach(function (lkpN) {
                            $("[id='sel_" + current_value.fieldName + "']").append("<option value='" + lkpN + "'>" + lkpN + "</option>");
                        });

                        // add on check to lookup to enable/disable the select list
                        $("[id='chk_" + current_value.fieldName + "']").on("click", function() {
                            if ($(this).is(":checked")){
                                $("[id='sel_" + current_value.fieldName + "']").removeAttr("disabled");
                            } else{
                                $("[id='sel_" + current_value.fieldName + "']").attr("disabled",true);
                            }
                        });

                    }
                });

                // try setting read only cols if they have been defined
                if (readOnlyCols != undefined && !isChange) {
                    //split into an array
                    var readOnlyColArray = readOnlyCols.split("|");

                    // loop over each column and mark as checked
                    readOnlyColArray.forEach(function (ro) {
                        $("[id='ro_" + ro + "']").prop("checked",true);
                    });
                }

                // try setting not null cols if they have been defined
                if (notNullCols != undefined && !isChange){
                    //split into array
                    var notNullColArray = notNullCols.split("|");

                    // loop over each column and mark as checked
                    notNullColArray.forEach(function (nn) {
                        $("[id='nn_" + nn + "']").prop("checked",true);
                    });
                }

                // try setting exclude cols if they have been defined
                if (excludeCols != undefined && !isChange) {
                    // split into array
                    var excludeColArray = excludeCols.split("|");

                    // loop over each column and mark as checked
                    excludeColArray.forEach(function (ex) {
                        $("[id='ex_" + ex + "']").prop("checked",true);
                    });
                }

                // try setting filter cols if they have been defined
                if (filterCols != undefined && !isChange) {
                    // split into array
                    var filterColArray = filterCols.split("|");

                    // loop over each column and mark as checked
                    filterColArray.forEach(function (fl) {
                        $("[id='fl_" + fl + "']").prop("checked",true);
                    });
                }
    
    
                // finally if not a change, then try to set the pre-existing values
                if (lookupCols != undefined && !isChange) {
                    //split the string into the first array of pairs
                    var lkpColArray = lookupCols.split("||");
    
                    //loop over each pair
                    lkpColArray.forEach(function (lc) {
                        var lkpColName = lc.split("|")[0];
                        var lkpColLkp = lc.split("|")[1];
    
                        var lkpChk = "[id='chk_" + lkpColName + "']";
                        var lkpSel = "[id='sel_" + lkpColName + "']";

                        $(lkpChk).prop("checked",true);
                        $(lkpSel).val(lkpColLkp);
                        $(lkpSel).removeAttr("disabled");
                    });
                }
    
            });
        });
    }

    function getAuthCode() {
        var authcode_accId = $("#snowflakeAccountId").val();
        var authcode_clientId = $("#snowflakeClientId").val();
        var authcode_redirect = $("#snowflakeRedirectUrl").val();
        var authcode_role = $("#snowflakeRole").val();

        var queryParams = {'client_id': authcode_clientId, 'response_type': 'code', 'redirect_uri': authcode_redirect, 'scope': 'refresh_token session:role:' + authcode_role};
        var urlparams = new URLSearchParams(queryParams);
        var authcode_url = "https://" + authcode_accId + ".snowflakecomputing.com/oauth/authorize?" + urlparams.toString();
        window.open(authcode_url,'_blank');
    }

    function getRefreshToken() {
        var token_accId = $("#snowflakeAccountId").val();
        var token_clientId = $("#snowflakeClientId").val();
        var token_clientSecret = $("#snowflakeClientSecret").val();
        var token_redirect = $("#snowflakeRedirectUrl").val();
        var token_code = $("#snowflakeAuthCode").val();

        var token_url = "https://" + token_accId + ".snowflakecomputing.com/oauth/token-request";
        var auth_header = "Basic " + btoa(token_clientId + ":" + token_clientSecret);

        $("#snowflakeCurl").val("curl -X POST -H \"Content-Type: application/x-www-form-urlencoded;charset=UTF-8\" --user \"" + token_clientId + ":" + token_clientSecret + "\" --data-urlencode \"grant_type=authorization_code\" --data-urlencode \"code=" + token_code + "\" --data-urlencode \"redirect_uri=" + token_redirect + "\" https://" + token_accId + ".snowflakecomputing.com/oauth/token-request");

        $.ajax({
            type: "POST",
            url: token_url,
            headers: {
                "Authorization": auth_header,
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
            },
            data: {
                "grant_type": "authorization_code",
                "code": token_code,
                "redirect_uri": token_redirect
            },
            error: function(error) {console.log(error)}
        }).always(function(data) {
            console.log(data);
        });

        // var settings = {
        //     "url": token_url,
        //     "headers": {
        //         "Authorization": auth_header,
        //         "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        //     },
        //     "data": {
        //         "grant_type": "authorization_code",
        //         "code": token_code,
        //         "redirect_uri": token_redirect
        //     }
        // };

        // $.post(settings, function(data){
        //     $("#snowflakeToken").val(data.refresh_token);
        // }).done(function(data) {
        //     console.log(data);
        // });
    }

    function closeDialog() {
        tableau.extensions.ui.closeDialog("10");
    }

    function saveButton() {
        // save all settings
        tableau.extensions.settings.set("mainWorksheet", $("#mainSheetList").val());
        tableau.extensions.settings.set("lookupWorksheet", $("#lookupSheetList").val());
        tableau.extensions.settings.set("usernameCol", $("#usernameColumn").val());
        tableau.extensions.settings.set("uniqueCols", $("#uniqueColumn").val().join("|"));
        tableau.extensions.settings.set("childParam", $("#childParam").val());
        tableau.extensions.settings.set("parentParam", $("#parentParam").val());
        tableau.extensions.settings.set("tableAlign", $("#tableAlign").val());


        if ($("#childParam").val() != "") {
            tableau.extensions.settings.set("childParam", $("#childParam").val());
        }
        if ($("#parentParam").val() != "") {
            tableau.extensions.settings.set("parentParam", $("#parentParam").val());
        }

        if ($("#enableNewRow").is(":checked")){
            tableau.extensions.settings.set("newRows","True");
        } else {
            tableau.extensions.settings.set("newRows","False");
        }

        if ($("#enableDelRow").is(":checked")){
            tableau.extensions.settings.set("delRows","True");
        } else {
            tableau.extensions.settings.set("delRows","False");
        }

        // Read Only Cols
        var roCols = [];
        $("[id^=ro_").filter(":checked").each(function() {
            var roCol = $(this).attr('id').substring(3);
            roCols.push(roCol);
        })
        tableau.extensions.settings.set("readOnlyCols", roCols.join("|"));

        // NOT NULL Cols
        var nnCols = [];
        $("[id^=nn_").filter(":checked").each(function() {
            var nnCol = $(this).attr("id").substring(3);
            nnCols.push(nnCol);
        });
        tableau.extensions.settings.set("notNullCols", nnCols.join("|"));

        // Exclude cols
        var exCols = [];
        $("[id^=ex_").filter(":checked").each(function() {
            var exCol = $(this).attr("id").substring(3);
            exCols.push(exCol);
        });
        tableau.extensions.settings.set("excludeCols", exCols.join("|"));

        // Filter Cols
        var flCols = [];
        $("[id^=fl_").filter(":checked").each(function() {
            var flCol = $(this).attr("id").substring(3);
            flCols.push(flCol);
        });
        tableau.extensions.settings.set("filterCols", flCols.join("|"));

        // lookup Cols
        var lkpCols = [];
        $("[id^=chk_]").filter(":checked").each(function() {
            var colWithLkp = $(this).attr('id').substring(4);
            var lkpRefId = "[id='sel_" + colWithLkp + "']";
            var lkpRefVal = $(lkpRefId).val();

            lkpCols.push(colWithLkp + "|" + lkpRefVal);
        });

        tableau.extensions.settings.set("lookupCols", lkpCols.join("||"));

        // snowflake settings
        tableau.extensions.settings.set("sfAccountId",$("#snowflakeAccountId").val());
        tableau.extensions.settings.set("sfRefreshToken",$("#snowflakeToken").val());
        tableau.extensions.settings.get("sfClientId",$("#snowflakeClientId").val());
        tableau.extensions.settings.get("sfClientSecret",$("#snowflakeClientSecret").val());
        tableau.extensions.settings.get("sfRedirectUrl",$("#snowflakeRedirectUrl").val());
        tableau.extensions.settings.get("sfDatabase",$("#snowflakeDatabase").val());
        tableau.extensions.settings.get("sfSchema",$("#snowflakeSchema").val());
        tableau.extensions.settings.get("sfWarehouse",$("#snowflakeWarehouse").val());
        tableau.extensions.settings.get("sfRole",$("#snowflakeRole").val());
        tableau.extensions.settings.get("sfEntity",$("#snowflakeEntity").val());



        // call saveAsync to save settings before calling closeDialog
        tableau.extensions.settings.saveAsync().then((currentSettings) => {
            tableau.extensions.ui.closeDialog("10");
        });
    }
})();