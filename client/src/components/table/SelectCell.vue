<template>
    <v-menu bottom>
      <template v-slot:activator="{on, attrs}">
        <v-btn text small style="padding: 0; min-width:0;" v-bind="attrs" v-on="on">
          <v-icon :color="currentItem && currentItem.color || ''">{{ currentItem && currentItem.icon || 'check_box_outline_blank' }}</v-icon>
        </v-btn>
      </template>
      <v-list nav dense>
        <v-list-item link v-for="(item, index) in items" :key="index" @click="currentItem=item">
          <v-list-item-icon><v-icon :color="item.color">{{ item.icon }}</v-icon></v-list-item-icon>
          <v-list-item-content>{{ item.text }}</v-list-item-content>
        </v-list-item>
      </v-list>
    </v-menu>
</template>

<script>

export default {
  name: 'SelectCell',
  data () {
    return {
      items: [],
      callback: undefined,
      currentItem: undefined,
      node: undefined,
      gridApi: undefined,
      data: undefined
    };
  },
  watch: {
    currentItem(newValue, oldValue) {
      if (newValue.selected) {
        // double fire select to ensure to trigger updates
        this.node.setSelected(false)
        this.node.setSelected(true)
      } else {
        // double fire select to ensure to trigger updates
        this.node.setSelected(true)
        this.node.setSelected(false)
      }
      this.params.setValue(newValue)
    }
  },
  created() {
    this.gridApi = this.params.api;
    this.node = this.params.node;
    this.currentItem = this.params.value || this.params.items[0];
    this.items = this.params.items;
    this.callback = this.params.callback;
    this.data = this.params.data;
  },
};

</script>