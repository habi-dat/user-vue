<template>
  <ag-grid-vue
    :localeText="aggridLocale.locale_de"
    style="width: 100%; height: 100%; overflow: hidden"
    class="ag-theme-material"
    :defaultColDef="defaultColDef"
    :columnDefs="columnDefs"
    :rowData="rowData"
    :isExternalFilterPresent="isExternalFilterPresent"
    :doesExternalFilterPass="doesExternalFilterPass"
    :rowSelection="rowSelection"
    suppressRowClickSelection="true"
    @grid-ready="onGridReady"
    @first-data-rendered="onFirstDataRendered"
    @selection-changed="onSelectionChanged"
  />
</template>

<script>
import axios from 'axios'
import moment from 'moment'
import router from '../../router'
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-material.css";
import aggridLocale from '@/assets/ag-grid.locale.js';
import { AgGridVue } from "ag-grid-vue";
import ExpanderCell from '@/components/table/ExpanderCell';
import ChipCell from '@/components/table/ChipCell';
import SelectCell from '@/components/table/SelectCell';
export default {
  name: 'GroupTable',
  components: {
    AgGridVue, ExpanderCell, ChipCell, SelectCell
  },
  props: ['groups', 'search', 'flat', 'showMembers', 'rowSelection', 'comboSelect'],
  data () {
    return {
      defaultColDef: [],
      columnDefs: [],
      rowData: [],
      collapsedNodes: [],
      aggridLocale: aggridLocale,
      selectedRows: [],
      gridApi: null,
      columnApi: null,
      renderedAndSized: false
    }
  },
  watch: {
    search(newSearch, oldSearch) {
      //this.gridApi.setQuickFilter(newSearch);
      this.rowData.forEach(row => {
        if (newSearch != '') {
          row.filtered = !row.rowText.toLowerCase().includes(newSearch.toLowerCase());
          //console.log(row.dn, 'filtered', row.filtered);
        } else {
          row.filtered = false;
        }
      })
      // also show parents of found rows
      this.rowData.forEach(row => {
        if (!row.filtered && newSearch != '') {
          this.rowData.forEach(r => {
            if(row.hierarchy.path.startsWith(r.hierarchy.path)) {
              r.filtered = false
            }
          })
        }
      })
      this.gridApi.onFilterChanged();
    }
  },
  methods: {
    onGridReady(params) {
        this.gridApi = params.api;
        this.columnApi = params.columnApi;
    },
    isExternalFilterPresent() {
      return true;
    },
    doesExternalFilterPass(node) {
      var pass = true;
      var self = this;
      this.collapsedNodes.forEach(cn => {
        if (node.data.hierarchy.path.startsWith(cn)) {
          pass = false;
        }
      })
      return pass && !node.data.filtered;
    },
    onFirstDataRendered(params) {
      this.columnApi.autoSizeAllColumns()
      this.renderedAndSized = true;
      this.$emit('renderedAndSized', this.renderedAndSized);
    },
    onSelectionChanged() {
      this.selectedRows = this.gridApi.getSelectedRows();
      this.$emit('selectGroup', this.selectedRows);
    },
    flattenTree(groups, parents, group) {
      var hierarchy = [].concat(parents);
      var flatGroup = {
        hierarchy: {hierarchy: parents, dn: group.dn, cn: group.cn, subGroups: group.subGroups},
        dn: group.dn,
        cn: group.cn,
        o: group.o,
        description: group.description,
        owner: group.owner,
        admins: group.owner.map(owner => { return owner.split(',')[0].split('=')[1]}),
        member: group.member,
        subGroups: group.subGroups,
        rowText: group.cn + ' ' + group.o + ' ' + group.description,
        selectCell: {}
      };
      hierarchy.push(group.dn);
      flatGroup.hierarchy.path = hierarchy.join('|')
      groups.push(flatGroup)
      if (group.subGroups) {
        group.subGroups.forEach(subGroup => {
          this.flattenTree(groups, hierarchy, subGroup);
        })
      }
    },
    expandGroup(expand, value) {
      if (!expand) {
        if (!this.collapsedNodes.includes(value)) {
          this.collapsedNodes.push(value);
        }
      } else {
        if (this.collapsedNodes.includes(value)) {
          this.collapsedNodes.splice(this.collapsedNodes.indexOf(value), 1);
        }
      }
      this.gridApi.onFilterChanged()
    }
  },
  created() {
    var selectorCellDef;
    if (this.comboSelect) {
      selectorCellDef = { headerName: "", field: "selectCell", maxWidth: 50, cellRenderer: 'SelectCell', cellRendererParams:
        { items: [
          { value: 'none', icon: 'check_box_outline_blank', text: 'Kein Mitglied', color:'black'},
          { value: 'member', icon: 'portrait', text:'Mitglied', selected: true, color: 'info'},
          { value: 'owner', icon: 'edit_square', text: 'Admin', selected: true, color: 'success'}
        ]}
      }
    } else {
      selectorCellDef = { checkboxSelection: true, maxWidth: 50};
    }

    var groupCellDef;
    if (this.flat) {
      groupCellDef = {headerName: 'Gruppe', field: 'cn'}
    } else {
      groupCellDef = { headerName: "Gruppe", field: "hierarchy", cellRenderer: 'ExpanderCell', cellRendererParams: { collapsedNodes: this.collapsedNodes, callback: this.expandGroup }
      }
    }

    this.columnDefs = [
      selectorCellDef,
      groupCellDef,
      { headerName: "Anzeigename", field: "o"},
      { headerName: "Beschreibung", field: "description"}
    ];
    if (this.showMembers) {
      this.columnDefs.push({ headerName: 'Mitglieder', valueGetter: (params) => { return params.data.member.length - params.data.subGroups.length }})
      this.columnDefs.push({ headerName: "Admin@s", field: "admins", cellStyle: {'white-space': 'normal'}, maxWidth: 250, autoHeight: true,cellRenderer: 'ChipCell', cellRendererParams: { icon: 'edit', color: 'info' }
        })

    }
    this.defaultColDef = {
      resizable: true,
    };
    var self = this;
    this.groups.forEach(group => {
      self.flattenTree(self.rowData, [], group);
    })
    console.log('rowdata', this.rowData.length)
  },
}
</script>
