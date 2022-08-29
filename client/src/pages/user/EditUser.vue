<template>
  <UserForm :user="user" title="Account erstellen" action="create" />
</template>

<script>
import UserForm from '@/components/user/UserForm'

export default {
  components: { UserForm },
  data() {
    return {
      user: {}
    }
  }
}
</script>