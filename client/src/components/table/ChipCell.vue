<template>
  <v-chip-group column>
     <v-chip v-for="item in items" v-bind:key="item" label outlined small>
       <v-icon left :color="params.color" small> {{ params.icon }} </v-icon>
       {{ item }}
     </v-chip>
  </v-chip-group>
</template>

<script>

export default {
  name: 'ChipCell',
  data () {
    return {
      items: [],
    };
  },
  beforeMount() {
    if (this.params.field) {
      this.items = this.params.value.map(item => {return item[this.params.field]})
    } else {
      this.items = this.params.value;
    }
  },
};

</script>